import { isBaseMessageChunk } from "./base.js";
import { ToolMessage, ToolMessageChunk } from "./tool.js";
import { AIMessage, AIMessageChunk } from "./ai.js";
import { ChatMessage, ChatMessageChunk } from "./chat.js";
import { FunctionMessage, FunctionMessageChunk } from "./function.js";
import { HumanMessage, HumanMessageChunk } from "./human.js";
import { RemoveMessage } from "./modifier.js";
import { SystemMessage, SystemMessageChunk } from "./system.js";
import { convertToChunk } from "./utils.js";
import { RunnableLambda } from "../runnables/base.js";
//#region src/messages/transformers.ts
const _isMessageType = (msg, types) => {
	const typesAsStrings = [...new Set(types?.map((t) => {
		if (typeof t === "string") return t;
		const instantiatedMsgClass = new t({});
		if (!("getType" in instantiatedMsgClass) || typeof instantiatedMsgClass.getType !== "function") throw new Error("Invalid type provided.");
		return instantiatedMsgClass.getType();
	}))];
	const msgType = msg.getType();
	return typesAsStrings.some((t) => t === msgType);
};
function filterMessages(messagesOrOptions, options) {
	if (Array.isArray(messagesOrOptions)) return _filterMessages(messagesOrOptions, options);
	return RunnableLambda.from((input) => {
		return _filterMessages(input, messagesOrOptions);
	});
}
function _filterMessages(messages, options = {}) {
	const { includeNames, excludeNames, includeTypes, excludeTypes, includeIds, excludeIds } = options;
	const filtered = [];
	for (const msg of messages) {
		if (excludeNames && msg.name && excludeNames.includes(msg.name)) continue;
		else if (excludeTypes && _isMessageType(msg, excludeTypes)) continue;
		else if (excludeIds && msg.id && excludeIds.includes(msg.id)) continue;
		if (!(includeTypes || includeIds || includeNames)) filtered.push(msg);
		else if (includeNames && msg.name && includeNames.some((iName) => iName === msg.name)) filtered.push(msg);
		else if (includeTypes && _isMessageType(msg, includeTypes)) filtered.push(msg);
		else if (includeIds && msg.id && includeIds.some((id) => id === msg.id)) filtered.push(msg);
	}
	return filtered;
}
function mergeMessageRuns(messages) {
	if (Array.isArray(messages)) return _mergeMessageRuns(messages);
	return RunnableLambda.from(_mergeMessageRuns);
}
function _mergeMessageRuns(messages) {
	if (!messages.length) return [];
	const merged = [];
	for (const msg of messages) {
		const curr = msg;
		const last = merged.pop();
		if (!last) merged.push(curr);
		else if (curr.getType() === "tool" || !(curr.getType() === last.getType())) merged.push(last, curr);
		else {
			const lastChunk = convertToChunk(last);
			const currChunk = convertToChunk(curr);
			const mergedChunks = lastChunk.concat(currChunk);
			if (typeof lastChunk.content === "string" && typeof currChunk.content === "string") mergedChunks.content = `${lastChunk.content}\n${currChunk.content}`;
			merged.push(_chunkToMsg(mergedChunks));
		}
	}
	return merged;
}
function trimMessages(messagesOrOptions, options) {
	if (Array.isArray(messagesOrOptions)) {
		const messages = messagesOrOptions;
		if (!options) throw new Error("Options parameter is required when providing messages.");
		return _trimMessagesHelper(messages, options);
	} else {
		const trimmerOptions = messagesOrOptions;
		return RunnableLambda.from((input) => _trimMessagesHelper(input, trimmerOptions)).withConfig({ runName: "trim_messages" });
	}
}
async function _trimMessagesHelper(messages, options) {
	const { maxTokens, tokenCounter, strategy = "last", allowPartial = false, endOn, startOn, includeSystem = false, textSplitter } = options;
	if (startOn && strategy === "first") throw new Error("`startOn` should only be specified if `strategy` is 'last'.");
	if (includeSystem && strategy === "first") throw new Error("`includeSystem` should only be specified if `strategy` is 'last'.");
	let listTokenCounter;
	if ("getNumTokens" in tokenCounter) listTokenCounter = async (msgs) => {
		return (await Promise.all(msgs.map((msg) => tokenCounter.getNumTokens(msg.content)))).reduce((sum, count) => sum + count, 0);
	};
	else listTokenCounter = async (msgs) => tokenCounter(msgs);
	let textSplitterFunc = defaultTextSplitter;
	if (textSplitter) if ("splitText" in textSplitter) textSplitterFunc = textSplitter.splitText;
	else textSplitterFunc = async (text) => textSplitter(text);
	if (strategy === "first") return _firstMaxTokens(messages, {
		maxTokens,
		tokenCounter: listTokenCounter,
		textSplitter: textSplitterFunc,
		partialStrategy: allowPartial ? "first" : void 0,
		endOn
	});
	else if (strategy === "last") return _lastMaxTokens(messages, {
		maxTokens,
		tokenCounter: listTokenCounter,
		textSplitter: textSplitterFunc,
		allowPartial,
		includeSystem,
		startOn,
		endOn
	});
	else throw new Error(`Unrecognized strategy: '${strategy}'. Must be one of 'first' or 'last'.`);
}
async function _firstMaxTokens(messages, options) {
	const { maxTokens, tokenCounter, textSplitter, partialStrategy, endOn } = options;
	let messagesCopy = [...messages];
	let idx = 0;
	for (let i = 0; i < messagesCopy.length; i += 1) if (await tokenCounter(i > 0 ? messagesCopy.slice(0, -i) : messagesCopy) <= maxTokens) {
		idx = messagesCopy.length - i;
		break;
	}
	if (idx < messagesCopy.length && partialStrategy) {
		let includedPartial = false;
		if (Array.isArray(messagesCopy[idx].content)) {
			const excluded = messagesCopy[idx];
			if (typeof excluded.content === "string") throw new Error("Expected content to be an array.");
			const numBlock = excluded.content.length;
			const reversedContent = partialStrategy === "last" ? [...excluded.content].reverse() : excluded.content;
			for (let i = 1; i <= numBlock; i += 1) {
				const partialContent = partialStrategy === "first" ? reversedContent.slice(0, i) : reversedContent.slice(-i);
				const fields = Object.fromEntries(Object.entries(excluded).filter(([k]) => k !== "type" && !k.startsWith("lc_")));
				const updatedMessage = _switchTypeToMessage(excluded.getType(), {
					...fields,
					content: partialContent
				});
				const slicedMessages = [...messagesCopy.slice(0, idx), updatedMessage];
				if (await tokenCounter(slicedMessages) <= maxTokens) {
					messagesCopy = slicedMessages;
					idx += 1;
					includedPartial = true;
				} else break;
			}
			if (includedPartial && partialStrategy === "last") excluded.content = [...reversedContent].reverse();
		}
		if (!includedPartial) {
			const excluded = messagesCopy[idx];
			let text;
			if (Array.isArray(excluded.content) && excluded.content.some((block) => typeof block === "string" || block.type === "text")) text = excluded.content.find((block) => block.type === "text" && block.text)?.text;
			else if (typeof excluded.content === "string") text = excluded.content;
			if (text) {
				const splitTexts = await textSplitter(text);
				const numSplits = splitTexts.length;
				if (partialStrategy === "last") splitTexts.reverse();
				for (let _ = 0; _ < numSplits - 1; _ += 1) {
					splitTexts.pop();
					excluded.content = splitTexts.join("");
					if (await tokenCounter([...messagesCopy.slice(0, idx), excluded]) <= maxTokens) {
						if (partialStrategy === "last") excluded.content = [...splitTexts].reverse().join("");
						messagesCopy = [...messagesCopy.slice(0, idx), excluded];
						idx += 1;
						break;
					}
				}
			}
		}
	}
	if (endOn) {
		const endOnArr = Array.isArray(endOn) ? endOn : [endOn];
		while (idx > 0 && !_isMessageType(messagesCopy[idx - 1], endOnArr)) idx -= 1;
	}
	return messagesCopy.slice(0, idx);
}
async function _lastMaxTokens(messages, options) {
	const { allowPartial = false, includeSystem = false, endOn, startOn, ...rest } = options;
	let messagesCopy = messages.map((message) => {
		const fields = Object.fromEntries(Object.entries(message).filter(([k]) => k !== "type" && !k.startsWith("lc_")));
		return _switchTypeToMessage(message.getType(), fields, isBaseMessageChunk(message));
	});
	if (endOn) {
		const endOnArr = Array.isArray(endOn) ? endOn : [endOn];
		while (messagesCopy.length > 0 && !_isMessageType(messagesCopy[messagesCopy.length - 1], endOnArr)) messagesCopy = messagesCopy.slice(0, -1);
	}
	const swappedSystem = includeSystem && messagesCopy[0]?.getType() === "system";
	let reversed_ = swappedSystem ? messagesCopy.slice(0, 1).concat(messagesCopy.slice(1).reverse()) : messagesCopy.reverse();
	reversed_ = await _firstMaxTokens(reversed_, {
		...rest,
		partialStrategy: allowPartial ? "last" : void 0,
		endOn: startOn
	});
	if (swappedSystem) return [reversed_[0], ...reversed_.slice(1).reverse()];
	else return reversed_.reverse();
}
const _MSG_CHUNK_MAP = {
	human: {
		message: HumanMessage,
		messageChunk: HumanMessageChunk
	},
	ai: {
		message: AIMessage,
		messageChunk: AIMessageChunk
	},
	system: {
		message: SystemMessage,
		messageChunk: SystemMessageChunk
	},
	developer: {
		message: SystemMessage,
		messageChunk: SystemMessageChunk
	},
	tool: {
		message: ToolMessage,
		messageChunk: ToolMessageChunk
	},
	function: {
		message: FunctionMessage,
		messageChunk: FunctionMessageChunk
	},
	generic: {
		message: ChatMessage,
		messageChunk: ChatMessageChunk
	},
	remove: {
		message: RemoveMessage,
		messageChunk: RemoveMessage
	}
};
function _switchTypeToMessage(messageType, fields, returnChunk) {
	let chunk;
	let msg;
	switch (messageType) {
		case "human":
			if (returnChunk) chunk = new HumanMessageChunk(fields);
			else msg = new HumanMessage(fields);
			break;
		case "ai":
			if (returnChunk) {
				let aiChunkFields = { ...fields };
				if ("tool_calls" in aiChunkFields) aiChunkFields = {
					...aiChunkFields,
					tool_call_chunks: aiChunkFields.tool_calls?.map((tc) => ({
						...tc,
						type: "tool_call_chunk",
						index: void 0,
						args: JSON.stringify(tc.args)
					}))
				};
				chunk = new AIMessageChunk(aiChunkFields);
			} else msg = new AIMessage(fields);
			break;
		case "system":
			if (returnChunk) chunk = new SystemMessageChunk(fields);
			else msg = new SystemMessage(fields);
			break;
		case "developer":
			if (returnChunk) chunk = new SystemMessageChunk({
				...fields,
				additional_kwargs: {
					...fields.additional_kwargs,
					__openai_role__: "developer"
				}
			});
			else msg = new SystemMessage({
				...fields,
				additional_kwargs: {
					...fields.additional_kwargs,
					__openai_role__: "developer"
				}
			});
			break;
		case "tool":
			if ("tool_call_id" in fields) if (returnChunk) chunk = new ToolMessageChunk(fields);
			else msg = new ToolMessage(fields);
			else throw new Error("Can not convert ToolMessage to ToolMessageChunk if 'tool_call_id' field is not defined.");
			break;
		case "function":
			if (returnChunk) chunk = new FunctionMessageChunk(fields);
			else {
				if (!fields.name) throw new Error("FunctionMessage must have a 'name' field");
				msg = new FunctionMessage(fields);
			}
			break;
		case "generic":
			if ("role" in fields) if (returnChunk) chunk = new ChatMessageChunk(fields);
			else msg = new ChatMessage(fields);
			else throw new Error("Can not convert ChatMessage to ChatMessageChunk if 'role' field is not defined.");
			break;
		default: throw new Error(`Unrecognized message type ${messageType}`);
	}
	if (returnChunk && chunk) return chunk;
	if (msg) return msg;
	throw new Error(`Unrecognized message type ${messageType}`);
}
function _chunkToMsg(chunk) {
	const chunkType = chunk.getType();
	let msg;
	const fields = Object.fromEntries(Object.entries(chunk).filter(([k]) => !["type", "tool_call_chunks"].includes(k) && !k.startsWith("lc_")));
	if (chunkType in _MSG_CHUNK_MAP) msg = _switchTypeToMessage(chunkType, fields);
	if (!msg) throw new Error(`Unrecognized message chunk class ${chunkType}. Supported classes are ${Object.keys(_MSG_CHUNK_MAP)}`);
	return msg;
}
/**
* The default text splitter function that splits text by newlines.
*
* @param {string} text
* @returns A promise that resolves to an array of strings split by newlines.
*/
function defaultTextSplitter(text) {
	const splits = text.split("\n");
	return Promise.resolve([...splits.slice(0, -1).map((s) => `${s}\n`), splits[splits.length - 1]]);
}
//#endregion
export { defaultTextSplitter, filterMessages, mergeMessageRuns, trimMessages };

//# sourceMappingURL=transformers.js.map