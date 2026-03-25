import { TAG_HIDDEN, TAG_NOSTREAM } from "../constants.js";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { AIMessageChunk, isBaseMessage, isBaseMessageChunk, isToolMessage } from "@langchain/core/messages";

//#region src/pregel/messages.ts
function isChatGenerationChunk(x) {
	return isBaseMessage(x?.message);
}
/**
* A callback handler that implements stream_mode=messages.
* Collects messages from (1) chat model stream events and (2) node outputs.
*/
var StreamMessagesHandler = class extends BaseCallbackHandler {
	name = "StreamMessagesHandler";
	streamFn;
	metadatas = {};
	seen = {};
	emittedChatModelRunIds = {};
	stableMessageIdMap = {};
	lc_prefer_streaming = true;
	constructor(streamFn) {
		super();
		this.streamFn = streamFn;
	}
	_emit(meta, message, runId, dedupe = false) {
		if (dedupe && message.id !== void 0 && this.seen[message.id] !== void 0) return;
		let messageId = message.id;
		if (runId != null) if (isToolMessage(message)) messageId ??= `run-${runId}-tool-${message.tool_call_id}`;
		else {
			if (messageId == null || messageId === `run-${runId}`) messageId = this.stableMessageIdMap[runId] ?? messageId ?? `run-${runId}`;
			this.stableMessageIdMap[runId] ??= messageId;
		}
		if (messageId !== message.id) {
			message.id = messageId;
			message.lc_kwargs.id = messageId;
		}
		if (message.id != null) this.seen[message.id] = message;
		this.streamFn([
			meta[0],
			"messages",
			[message, meta[1]]
		]);
	}
	handleChatModelStart(_llm, _messages, runId, _parentRunId, _extraParams, tags, metadata, name) {
		if (metadata && (!tags || !tags.includes(TAG_NOSTREAM) && !tags.includes("nostream"))) this.metadatas[runId] = [metadata.langgraph_checkpoint_ns.split("|"), {
			tags,
			name,
			...metadata
		}];
	}
	handleLLMNewToken(token, _idx, runId, _parentRunId, _tags, fields) {
		const chunk = fields?.chunk;
		this.emittedChatModelRunIds[runId] = true;
		if (this.metadatas[runId] !== void 0) if (isChatGenerationChunk(chunk)) this._emit(this.metadatas[runId], chunk.message, runId);
		else this._emit(this.metadatas[runId], new AIMessageChunk({ content: token }), runId);
	}
	handleLLMEnd(output, runId) {
		if (this.metadatas[runId] === void 0) return;
		if (!this.emittedChatModelRunIds[runId]) {
			const chatGeneration = output.generations?.[0]?.[0];
			if (isBaseMessage(chatGeneration?.message)) this._emit(this.metadatas[runId], chatGeneration?.message, runId, true);
			delete this.emittedChatModelRunIds[runId];
		}
		delete this.metadatas[runId];
		delete this.stableMessageIdMap[runId];
	}
	handleLLMError(_err, runId) {
		delete this.metadatas[runId];
	}
	handleChainStart(_chain, inputs, runId, _parentRunId, tags, metadata, _runType, name) {
		if (metadata !== void 0 && name === metadata.langgraph_node && (tags === void 0 || !tags.includes(TAG_HIDDEN))) {
			this.metadatas[runId] = [metadata.langgraph_checkpoint_ns.split("|"), {
				tags,
				name,
				...metadata
			}];
			if (typeof inputs === "object") {
				for (const value of Object.values(inputs)) if ((isBaseMessage(value) || isBaseMessageChunk(value)) && value.id !== void 0) this.seen[value.id] = value;
				else if (Array.isArray(value)) {
					for (const item of value) if ((isBaseMessage(item) || isBaseMessageChunk(item)) && item.id !== void 0) this.seen[item.id] = item;
				}
			}
		}
	}
	handleChainEnd(outputs, runId) {
		const metadata = this.metadatas[runId];
		delete this.metadatas[runId];
		if (metadata !== void 0) {
			if (isBaseMessage(outputs)) this._emit(metadata, outputs, runId, true);
			else if (Array.isArray(outputs)) {
				for (const value of outputs) if (isBaseMessage(value)) this._emit(metadata, value, runId, true);
			} else if (outputs != null && typeof outputs === "object") {
				for (const value of Object.values(outputs)) if (isBaseMessage(value)) this._emit(metadata, value, runId, true);
				else if (Array.isArray(value)) {
					for (const item of value) if (isBaseMessage(item)) this._emit(metadata, item, runId, true);
				}
			}
		}
	}
	handleChainError(_err, runId) {
		delete this.metadatas[runId];
	}
};

//#endregion
export { StreamMessagesHandler };
//# sourceMappingURL=messages.js.map