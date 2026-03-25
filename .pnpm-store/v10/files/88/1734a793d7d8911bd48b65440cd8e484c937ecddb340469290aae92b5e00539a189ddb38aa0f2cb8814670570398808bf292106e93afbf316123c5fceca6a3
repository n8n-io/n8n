const require_errors_index = require("../errors/index.cjs");
const require_utils = require("../tools/utils.cjs");
const require_json = require("../utils/json.cjs");
const require_base = require("./base.cjs");
const require_messages_tool = require("./tool.cjs");
const require_ai = require("./ai.cjs");
const require_chat = require("./chat.cjs");
const require_function = require("./function.cjs");
const require_human = require("./human.cjs");
const require_modifier = require("./modifier.cjs");
const require_system = require("./system.cjs");
//#region src/messages/utils.ts
/**
* Immediately-invoked function expression.
*
* @param fn - The function to execute
* @returns The result of the function
*/
const iife = (fn) => fn();
function _coerceToolCall(toolCall) {
	if (require_utils._isToolCall(toolCall)) return toolCall;
	else if (typeof toolCall.id === "string" && toolCall.type === "function" && typeof toolCall.function === "object" && toolCall.function !== null && "arguments" in toolCall.function && typeof toolCall.function.arguments === "string" && "name" in toolCall.function && typeof toolCall.function.name === "string") return {
		id: toolCall.id,
		args: JSON.parse(toolCall.function.arguments),
		name: toolCall.function.name,
		type: "tool_call"
	};
	else return toolCall;
}
function isSerializedConstructor(x) {
	return typeof x === "object" && x != null && x.lc === 1 && Array.isArray(x.id) && x.kwargs != null && typeof x.kwargs === "object";
}
function _constructMessageFromParams(params) {
	let type;
	let rest;
	if (isSerializedConstructor(params)) {
		const className = params.id.at(-1);
		if (className === "HumanMessage" || className === "HumanMessageChunk") type = "user";
		else if (className === "AIMessage" || className === "AIMessageChunk") type = "assistant";
		else if (className === "SystemMessage" || className === "SystemMessageChunk") type = "system";
		else if (className === "FunctionMessage" || className === "FunctionMessageChunk") type = "function";
		else if (className === "ToolMessage" || className === "ToolMessageChunk") type = "tool";
		else type = "unknown";
		rest = params.kwargs;
	} else {
		const { type: extractedType, ...otherParams } = params;
		type = extractedType;
		rest = otherParams;
	}
	if (type === "human" || type === "user") return new require_human.HumanMessage(rest);
	else if (type === "ai" || type === "assistant") {
		const { tool_calls: rawToolCalls, ...other } = rest;
		if (!Array.isArray(rawToolCalls)) return new require_ai.AIMessage(rest);
		const tool_calls = rawToolCalls.map(_coerceToolCall);
		return new require_ai.AIMessage({
			...other,
			tool_calls
		});
	} else if (type === "system") return new require_system.SystemMessage(rest);
	else if (type === "developer") return new require_system.SystemMessage({
		...rest,
		additional_kwargs: {
			...rest.additional_kwargs,
			__openai_role__: "developer"
		}
	});
	else if (type === "tool" && "tool_call_id" in rest) return new require_messages_tool.ToolMessage({
		...rest,
		content: rest.content,
		tool_call_id: rest.tool_call_id,
		name: rest.name
	});
	else if (type === "remove" && "id" in rest && typeof rest.id === "string") return new require_modifier.RemoveMessage({
		...rest,
		id: rest.id
	});
	else throw require_errors_index.addLangChainErrorFields(/* @__PURE__ */ new Error(`Unable to coerce message from array: only human, AI, system, developer, or tool message coercion is currently supported.\n\nReceived: ${JSON.stringify(params, null, 2)}`), "MESSAGE_COERCION_FAILURE");
}
function coerceMessageLikeToMessage(messageLike) {
	if (typeof messageLike === "string") return new require_human.HumanMessage(messageLike);
	else if (require_base.isBaseMessage(messageLike)) return messageLike;
	if (Array.isArray(messageLike)) {
		const [type, content] = messageLike;
		return _constructMessageFromParams({
			type,
			content
		});
	} else if (require_base._isMessageFieldWithRole(messageLike)) {
		const { role: type, ...rest } = messageLike;
		return _constructMessageFromParams({
			...rest,
			type
		});
	} else return _constructMessageFromParams(messageLike);
}
/**
* Renders a single content block to a compact string representation.
* Text blocks are returned as-is; multimodal blocks (image, audio, video, file)
* become short placeholders like `[image]` so their existence is preserved
* without inflating token counts with base64 data or metadata.
*/
function _contentBlockToString(block) {
	if (typeof block === "string") return block;
	switch (block.type) {
		case "text": return block.text ?? "";
		case "text-plain": return block.text ?? "[text-plain file]";
		case "image":
		case "image_url": return "[image]";
		case "audio":
		case "input_audio": return "[audio]";
		case "video": return "[video]";
		case "file": return "[file]";
		case "reasoning":
		case "tool_call":
		case "tool_call_chunk":
		case "invalid_tool_call":
		case "server_tool_call":
		case "server_tool_call_chunk":
		case "server_tool_call_result":
		case "non_standard": return "";
		default: return block.type ? `[${block.type}]` : "";
	}
}
/**
* This function is used by memory classes to get a string representation
* of the chat message history, based on the message content and role.
*
* Produces compact output like:
* ```
* Human: What's the weather?
* AI: Let me check...[tool_calls]
* Tool: 72°F and sunny
* ```
*
* This avoids token inflation from metadata when stringifying message objects directly.
*/
function getBufferString(messages, humanPrefix = "Human", aiPrefix = "AI") {
	const string_messages = [];
	for (const m of messages) {
		let role;
		if (m.type === "human") role = humanPrefix;
		else if (m.type === "ai") role = aiPrefix;
		else if (m.type === "system") role = "System";
		else if (m.type === "tool") role = "Tool";
		else if (m.type === "generic") role = m.role;
		else throw new Error(`Got unsupported message type: ${m.type}`);
		const nameStr = m.name ? `${m.name}, ` : "";
		const readableContent = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map(_contentBlockToString).filter(Boolean).join("") : "";
		let message = `${role}: ${nameStr}${readableContent}`;
		if (m.type === "ai") {
			const aiMessage = m;
			if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) message += JSON.stringify(aiMessage.tool_calls);
			else if (aiMessage.additional_kwargs && "function_call" in aiMessage.additional_kwargs) message += JSON.stringify(aiMessage.additional_kwargs.function_call);
		}
		string_messages.push(message);
	}
	return string_messages.join("\n");
}
/**
* Maps messages from an older format (V1) to the current `StoredMessage`
* format. If the message is already in the `StoredMessage` format, it is
* returned as is. Otherwise, it transforms the V1 message into a
* `StoredMessage`. This function is important for maintaining
* compatibility with older message formats.
*/
function mapV1MessageToStoredMessage(message) {
	if (message.data !== void 0) return message;
	else {
		const v1Message = message;
		return {
			type: v1Message.type,
			data: {
				content: v1Message.text,
				role: v1Message.role,
				name: void 0,
				tool_call_id: void 0
			}
		};
	}
}
function mapStoredMessageToChatMessage(message) {
	const storedMessage = mapV1MessageToStoredMessage(message);
	switch (storedMessage.type) {
		case "human": return new require_human.HumanMessage(storedMessage.data);
		case "ai": return new require_ai.AIMessage(storedMessage.data);
		case "system": return new require_system.SystemMessage(storedMessage.data);
		case "function":
			if (storedMessage.data.name === void 0) throw new Error("Name must be defined for function messages");
			return new require_function.FunctionMessage(storedMessage.data);
		case "tool":
			if (storedMessage.data.tool_call_id === void 0) throw new Error("Tool call ID must be defined for tool messages");
			return new require_messages_tool.ToolMessage(storedMessage.data);
		case "generic":
			if (storedMessage.data.role === void 0) throw new Error("Role must be defined for chat messages");
			return new require_chat.ChatMessage(storedMessage.data);
		default: throw new Error(`Got unexpected type: ${storedMessage.type}`);
	}
}
/**
* Transforms an array of `StoredMessage` instances into an array of
* `BaseMessage` instances. It uses the `mapV1MessageToStoredMessage`
* function to ensure all messages are in the `StoredMessage` format, then
* creates new instances of the appropriate `BaseMessage` subclass based
* on the type of each message. This function is used to prepare stored
* messages for use in a chat context.
*/
function mapStoredMessagesToChatMessages(messages) {
	return messages.map(mapStoredMessageToChatMessage);
}
/**
* Transforms an array of `BaseMessage` instances into an array of
* `StoredMessage` instances. It does this by calling the `toDict` method
* on each `BaseMessage`, which returns a `StoredMessage`. This function
* is used to prepare chat messages for storage.
*/
function mapChatMessagesToStoredMessages(messages) {
	return messages.map((message) => message.toDict());
}
function convertToChunk(message) {
	const type = message._getType();
	if (type === "human") return new require_human.HumanMessageChunk({ ...message });
	else if (type === "ai") {
		let aiChunkFields = { ...message };
		if ("tool_calls" in aiChunkFields) aiChunkFields = {
			...aiChunkFields,
			tool_call_chunks: aiChunkFields.tool_calls?.map((tc) => ({
				...tc,
				type: "tool_call_chunk",
				index: void 0,
				args: JSON.stringify(tc.args)
			}))
		};
		return new require_ai.AIMessageChunk({ ...aiChunkFields });
	} else if (type === "system") return new require_system.SystemMessageChunk({ ...message });
	else if (type === "function") return new require_function.FunctionMessageChunk({ ...message });
	else if (require_chat.ChatMessage.isInstance(message)) return new require_chat.ChatMessageChunk({ ...message });
	else throw new Error("Unknown message type.");
}
/**
* Collapses an array of tool call chunks into complete tool calls.
*
* This function groups tool call chunks by their id and/or index, then attempts to
* parse and validate the accumulated arguments for each group. Successfully parsed
* tool calls are returned as valid `ToolCall` objects, while malformed ones are
* returned as `InvalidToolCall` objects.
*
* @param chunks - An array of `ToolCallChunk` objects to collapse
* @returns An object containing:
*   - `tool_call_chunks`: The original input chunks
*   - `tool_calls`: An array of successfully parsed and validated tool calls
*   - `invalid_tool_calls`: An array of tool calls that failed parsing or validation
*
* @remarks
* Chunks are grouped using the following matching logic:
* - If a chunk has both an id and index, it matches chunks with the same id and index
* - If a chunk has only an id, it matches chunks with the same id
* - If a chunk has only an index, it matches chunks with the same index
*
* For each group, the function:
* 1. Concatenates all `args` strings from the chunks
* 2. Attempts to parse the concatenated string as JSON
* 3. Validates that the result is a non-null object with a valid id
* 4. Creates either a `ToolCall` (if valid) or `InvalidToolCall` (if invalid)
*/
function collapseToolCallChunks(chunks) {
	const groupedToolCallChunks = chunks.reduce((acc, chunk) => {
		const matchedChunkIndex = acc.findIndex(([match]) => {
			if ("id" in chunk && chunk.id && "index" in chunk && chunk.index !== void 0) return chunk.id === match.id && chunk.index === match.index;
			if ("id" in chunk && chunk.id) return chunk.id === match.id;
			if ("index" in chunk && chunk.index !== void 0) return chunk.index === match.index;
			return false;
		});
		if (matchedChunkIndex !== -1) acc[matchedChunkIndex].push(chunk);
		else acc.push([chunk]);
		return acc;
	}, []);
	const toolCalls = [];
	const invalidToolCalls = [];
	for (const chunks of groupedToolCallChunks) {
		let parsedArgs = null;
		const name = chunks[0]?.name ?? "";
		const joinedArgs = chunks.map((c) => c.args || "").join("").trim();
		const argsStr = joinedArgs.length ? joinedArgs : "{}";
		const id = chunks[0]?.id;
		try {
			parsedArgs = require_json.parsePartialJson(argsStr);
			if (!id || parsedArgs === null || typeof parsedArgs !== "object" || Array.isArray(parsedArgs)) throw new Error("Malformed tool call chunk args.");
			toolCalls.push({
				name,
				args: parsedArgs,
				id,
				type: "tool_call"
			});
		} catch {
			invalidToolCalls.push({
				name,
				args: argsStr,
				id,
				error: "Malformed args.",
				type: "invalid_tool_call"
			});
		}
	}
	return {
		tool_call_chunks: chunks,
		tool_calls: toolCalls,
		invalid_tool_calls: invalidToolCalls
	};
}
//#endregion
exports.coerceMessageLikeToMessage = coerceMessageLikeToMessage;
exports.collapseToolCallChunks = collapseToolCallChunks;
exports.convertToChunk = convertToChunk;
exports.getBufferString = getBufferString;
exports.iife = iife;
exports.mapChatMessagesToStoredMessages = mapChatMessagesToStoredMessages;
exports.mapStoredMessageToChatMessage = mapStoredMessageToChatMessage;
exports.mapStoredMessagesToChatMessages = mapStoredMessagesToChatMessages;

//# sourceMappingURL=utils.cjs.map