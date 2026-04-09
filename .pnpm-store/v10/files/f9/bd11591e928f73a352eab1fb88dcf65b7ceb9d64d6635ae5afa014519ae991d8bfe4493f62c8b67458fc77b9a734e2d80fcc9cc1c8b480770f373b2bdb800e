require("../_virtual/_rolldown/runtime.cjs");
let _langchain_core_messages = require("@langchain/core/messages");
//#region src/ui/messages.ts
function tryConvertToChunk(message) {
	try {
		if ((0, _langchain_core_messages.isBaseMessageChunk)(message)) return message;
		return (0, _langchain_core_messages.convertToChunk)(message);
	} catch {
		return null;
	}
}
function tryCoerceMessageLikeToMessage(message) {
	if (message.type === "human" || message.type === "user") return new _langchain_core_messages.HumanMessageChunk(message);
	if (message.type === "ai" || message.type === "assistant") return new _langchain_core_messages.AIMessageChunk(message);
	if (message.type === "system") return new _langchain_core_messages.SystemMessageChunk(message);
	if (message.type === "tool" && "tool_call_id" in message) return new _langchain_core_messages.ToolMessageChunk({
		...message,
		tool_call_id: message.tool_call_id
	});
	if (message.type === "remove" && message.id != null) return new _langchain_core_messages.RemoveMessage({
		...message,
		id: message.id
	});
	return (0, _langchain_core_messages.coerceMessageLikeToMessage)(message);
}
var MessageTupleManager = class {
	chunks = {};
	constructor() {
		this.chunks = {};
	}
	add(serialized, metadata) {
		if (serialized.type.endsWith("MessageChunk")) serialized.type = serialized.type.slice(0, -12).toLowerCase();
		const message = tryCoerceMessageLikeToMessage(serialized);
		const chunk = tryConvertToChunk(message);
		const { id } = chunk ?? message;
		if (!id) {
			console.warn("No message ID found for chunk, ignoring in state", serialized);
			return null;
		}
		this.chunks[id] ??= {};
		this.chunks[id].metadata = metadata ?? this.chunks[id].metadata;
		if (chunk) {
			const prev = this.chunks[id].chunk;
			this.chunks[id].chunk = ((0, _langchain_core_messages.isBaseMessageChunk)(prev) ? prev : null)?.concat(chunk) ?? chunk;
		} else this.chunks[id].chunk = message;
		return id;
	}
	clear() {
		this.chunks = {};
	}
	get(id, defaultIndex) {
		if (id == null) return null;
		if (this.chunks[id] == null) return null;
		if (defaultIndex != null) this.chunks[id].index ??= defaultIndex;
		return this.chunks[id];
	}
};
const toMessageDict = (chunk) => {
	const { type, data } = chunk.toDict();
	return {
		...data,
		type
	};
};
/**
* Identity converter that keeps @langchain/core class instances.
* Used by framework SDKs to expose BaseMessage instances instead of plain dicts.
*/
const toMessageClass = (chunk) => chunk;
/**
* Ensures all messages in an array are BaseMessage class instances.
* Messages that are already class instances pass through unchanged.
* Plain message objects (e.g. from API values/history) are converted
* via {@link tryCoerceMessageLikeToMessage}.
*/
function ensureMessageInstances(messages) {
	return messages.map((msg) => {
		if (typeof msg.getType === "function") return msg;
		return tryCoerceMessageLikeToMessage(msg);
	});
}
/**
* Converts plain message objects within each history state's values
* to proper BaseMessage class instances. Returns a new array with
* shallow-copied states whose messages have been coerced.
*/
function ensureHistoryMessageInstances(history, messagesKey = "messages") {
	return history.map((state) => {
		if (state.values == null) return state;
		const messages = state.values[messagesKey];
		if (!Array.isArray(messages)) return state;
		return {
			...state,
			values: {
				...state.values,
				[messagesKey]: ensureMessageInstances(messages)
			}
		};
	});
}
//#endregion
exports.MessageTupleManager = MessageTupleManager;
exports.ensureHistoryMessageInstances = ensureHistoryMessageInstances;
exports.ensureMessageInstances = ensureMessageInstances;
exports.toMessageClass = toMessageClass;
exports.toMessageDict = toMessageDict;

//# sourceMappingURL=messages.cjs.map