import { BaseMessage, BaseMessageChunk, _mergeDicts, _mergeLists, mergeContent } from "./base.js";
import { getTranslator } from "./block_translators/index.js";
import { mergeResponseMetadata, mergeUsageMetadata } from "./metadata.js";
import { defaultToolCallParser } from "./tool.js";
import { collapseToolCallChunks } from "./utils.js";
//#region src/messages/ai.ts
var AIMessage = class extends BaseMessage {
	type = "ai";
	tool_calls = [];
	invalid_tool_calls = [];
	usage_metadata;
	get lc_aliases() {
		return {
			...super.lc_aliases,
			tool_calls: "tool_calls",
			invalid_tool_calls: "invalid_tool_calls",
			usage_metadata: "usage_metadata"
		};
	}
	constructor(fields) {
		let initParams;
		if (typeof fields === "string" || Array.isArray(fields)) initParams = {
			content: fields,
			tool_calls: [],
			invalid_tool_calls: [],
			additional_kwargs: {}
		};
		else {
			initParams = fields;
			const rawToolCalls = initParams.additional_kwargs?.tool_calls;
			const toolCalls = initParams.tool_calls;
			if (!(rawToolCalls == null) && rawToolCalls.length > 0 && (toolCalls === void 0 || toolCalls.length === 0)) console.warn([
				"New LangChain packages are available that more efficiently handle",
				"tool calling.\n\nPlease upgrade your packages to versions that set",
				"message tool calls. e.g., `pnpm install @langchain/anthropic`,",
				"pnpm install @langchain/openai`, etc."
			].join(" "));
			try {
				if (!(rawToolCalls == null) && toolCalls === void 0) {
					const [parsedToolCalls, invalidToolCalls] = defaultToolCallParser(rawToolCalls);
					initParams.tool_calls = parsedToolCalls ?? [];
					initParams.invalid_tool_calls = invalidToolCalls ?? [];
				} else {
					initParams.tool_calls = initParams.tool_calls ?? [];
					initParams.invalid_tool_calls = initParams.invalid_tool_calls ?? [];
				}
			} catch {
				initParams.tool_calls = [];
				initParams.invalid_tool_calls = [];
			}
			if (initParams.response_metadata !== void 0 && "output_version" in initParams.response_metadata && initParams.response_metadata.output_version === "v1") {
				initParams.contentBlocks = initParams.content;
				initParams.content = void 0;
			}
			if (initParams.contentBlocks !== void 0) {
				if (initParams.tool_calls) initParams.contentBlocks.push(...initParams.tool_calls.map((toolCall) => ({
					type: "tool_call",
					id: toolCall.id,
					name: toolCall.name,
					args: toolCall.args
				})));
				const missingToolCalls = initParams.contentBlocks.filter((block) => block.type === "tool_call").filter((block) => !initParams.tool_calls?.some((toolCall) => toolCall.id === block.id && toolCall.name === block.name));
				if (missingToolCalls.length > 0) initParams.tool_calls = missingToolCalls.map((block) => ({
					type: "tool_call",
					id: block.id,
					name: block.name,
					args: block.args
				}));
			}
		}
		super(initParams);
		if (typeof initParams !== "string") {
			this.tool_calls = initParams.tool_calls ?? this.tool_calls;
			this.invalid_tool_calls = initParams.invalid_tool_calls ?? this.invalid_tool_calls;
		}
		this.usage_metadata = initParams.usage_metadata;
	}
	static lc_name() {
		return "AIMessage";
	}
	get contentBlocks() {
		if (this.response_metadata && "output_version" in this.response_metadata && this.response_metadata.output_version === "v1") return this.content;
		if (this.response_metadata && "model_provider" in this.response_metadata && typeof this.response_metadata.model_provider === "string") {
			const translator = getTranslator(this.response_metadata.model_provider);
			if (translator) return translator.translateContent(this);
		}
		const blocks = super.contentBlocks;
		if (this.tool_calls) {
			const missingToolCalls = this.tool_calls.filter((block) => !blocks.some((b) => b.id === block.id && b.name === block.name));
			blocks.push(...missingToolCalls.map((block) => ({
				type: "tool_call",
				id: block.id,
				name: block.name,
				args: block.args
			})));
		}
		return blocks;
	}
	get _printableFields() {
		return {
			...super._printableFields,
			tool_calls: this.tool_calls,
			invalid_tool_calls: this.invalid_tool_calls,
			usage_metadata: this.usage_metadata
		};
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "ai";
	}
};
/**
* @deprecated Use {@link AIMessage.isInstance} instead
*/
function isAIMessage(x) {
	return x._getType() === "ai";
}
/**
* @deprecated Use {@link AIMessageChunk.isInstance} instead
*/
function isAIMessageChunk(x) {
	return x._getType() === "ai";
}
/**
* Represents a chunk of an AI message, which can be concatenated with
* other AI message chunks.
*/
var AIMessageChunk = class extends BaseMessageChunk {
	type = "ai";
	tool_calls = [];
	invalid_tool_calls = [];
	tool_call_chunks = [];
	usage_metadata;
	constructor(fields) {
		let initParams;
		if (typeof fields === "string" || Array.isArray(fields)) initParams = {
			content: fields,
			tool_calls: [],
			invalid_tool_calls: [],
			tool_call_chunks: []
		};
		else if (fields.tool_call_chunks === void 0 || fields.tool_call_chunks.length === 0) initParams = {
			...fields,
			tool_calls: fields.tool_calls ?? [],
			invalid_tool_calls: [],
			tool_call_chunks: [],
			usage_metadata: fields.usage_metadata !== void 0 ? fields.usage_metadata : void 0
		};
		else {
			const collapsed = collapseToolCallChunks(fields.tool_call_chunks ?? []);
			initParams = {
				...fields,
				tool_call_chunks: collapsed.tool_call_chunks,
				tool_calls: collapsed.tool_calls,
				invalid_tool_calls: collapsed.invalid_tool_calls,
				usage_metadata: fields.usage_metadata !== void 0 ? fields.usage_metadata : void 0
			};
		}
		super(initParams);
		this.tool_call_chunks = initParams.tool_call_chunks ?? this.tool_call_chunks;
		this.tool_calls = initParams.tool_calls ?? this.tool_calls;
		this.invalid_tool_calls = initParams.invalid_tool_calls ?? this.invalid_tool_calls;
		this.usage_metadata = initParams.usage_metadata;
	}
	get lc_aliases() {
		return {
			...super.lc_aliases,
			tool_calls: "tool_calls",
			invalid_tool_calls: "invalid_tool_calls",
			tool_call_chunks: "tool_call_chunks",
			usage_metadata: "usage_metadata"
		};
	}
	static lc_name() {
		return "AIMessageChunk";
	}
	get contentBlocks() {
		if (this.response_metadata && "output_version" in this.response_metadata && this.response_metadata.output_version === "v1") return this.content;
		if (this.response_metadata && "model_provider" in this.response_metadata && typeof this.response_metadata.model_provider === "string") {
			const translator = getTranslator(this.response_metadata.model_provider);
			if (translator) return translator.translateContent(this);
		}
		const blocks = super.contentBlocks;
		if (this.tool_calls) {
			if (typeof this.content !== "string") {
				const contentToolCalls = this.content.filter((block) => block.type === "tool_call").map((block) => block.id);
				for (const toolCall of this.tool_calls) if (toolCall.id && !contentToolCalls.includes(toolCall.id)) blocks.push({
					...toolCall,
					type: "tool_call",
					id: toolCall.id,
					name: toolCall.name,
					args: toolCall.args
				});
			}
		}
		return blocks;
	}
	get _printableFields() {
		return {
			...super._printableFields,
			tool_calls: this.tool_calls,
			tool_call_chunks: this.tool_call_chunks,
			invalid_tool_calls: this.invalid_tool_calls,
			usage_metadata: this.usage_metadata
		};
	}
	concat(chunk) {
		const combinedFields = {
			content: mergeContent(this.content, chunk.content),
			additional_kwargs: _mergeDicts(this.additional_kwargs, chunk.additional_kwargs),
			response_metadata: mergeResponseMetadata(this.response_metadata, chunk.response_metadata),
			tool_call_chunks: [],
			tool_calls: [],
			id: this.id ?? chunk.id
		};
		if (this.tool_call_chunks !== void 0 || chunk.tool_call_chunks !== void 0) {
			const rawToolCalls = _mergeLists(this.tool_call_chunks, chunk.tool_call_chunks);
			if (rawToolCalls !== void 0 && rawToolCalls.length > 0) combinedFields.tool_call_chunks = rawToolCalls;
		}
		if (this.tool_calls !== void 0 || chunk.tool_calls !== void 0) {
			const rawToolCalls = _mergeLists(this.tool_calls, chunk.tool_calls);
			if (rawToolCalls !== void 0 && rawToolCalls.length > 0) combinedFields.tool_calls = rawToolCalls;
		}
		if (this.usage_metadata !== void 0 || chunk.usage_metadata !== void 0) combinedFields.usage_metadata = mergeUsageMetadata(this.usage_metadata, chunk.usage_metadata);
		const Cls = this.constructor;
		return new Cls(combinedFields);
	}
	static isInstance(obj) {
		return super.isInstance(obj) && obj.type === "ai";
	}
};
//#endregion
export { AIMessage, AIMessageChunk, isAIMessage, isAIMessageChunk };

//# sourceMappingURL=ai.js.map