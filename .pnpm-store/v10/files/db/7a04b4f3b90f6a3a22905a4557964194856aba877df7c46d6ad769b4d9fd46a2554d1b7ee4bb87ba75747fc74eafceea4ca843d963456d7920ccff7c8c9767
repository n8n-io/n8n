const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));

//#region src/utils/message_outputs.ts
function convertConverseMessageToLangChainMessage(message, responseMetadata) {
	if (!message.content) throw new Error("No message content found in response.");
	if (message.role !== "assistant") throw new Error(`Unsupported message role received in ChatBedrockConverse response: ${message.role}`);
	let requestId;
	if ("$metadata" in responseMetadata && responseMetadata.$metadata && typeof responseMetadata.$metadata === "object" && "requestId" in responseMetadata.$metadata) requestId = responseMetadata.$metadata.requestId;
	let tokenUsage;
	if (responseMetadata.usage) {
		const input_tokens = responseMetadata.usage.inputTokens ?? 0;
		const output_tokens = responseMetadata.usage.outputTokens ?? 0;
		tokenUsage = {
			input_tokens,
			output_tokens,
			total_tokens: responseMetadata.usage.totalTokens ?? input_tokens + output_tokens
		};
	}
	if (message.content?.length === 1 && "text" in message.content[0] && typeof message.content[0].text === "string") return new __langchain_core_messages.AIMessage({
		content: message.content[0].text,
		response_metadata: {
			...responseMetadata,
			model_provider: "bedrock-converse"
		},
		usage_metadata: tokenUsage,
		id: requestId
	});
	else {
		const toolCalls = [];
		const content = [];
		message.content.forEach((c) => {
			if ("cachePoint" in c) content.push({
				type: "cache_point",
				cachePoint: c.cachePoint
			});
			else if ("citationsContent" in c) content.push({
				type: "citations_content",
				citationsContent: c.citationsContent
			});
			else if ("document" in c) content.push({
				type: "document",
				document: c.document
			});
			else if ("guardContent" in c) content.push({
				type: "guard_content",
				guardContent: c.guardContent
			});
			else if ("image" in c) content.push({
				type: "image",
				image: c.image
			});
			else if ("reasoningContent" in c) content.push(bedrockReasoningBlockToLangchainReasoningBlock(c.reasoningContent));
			else if ("text" in c && typeof c.text === "string") content.push({
				type: "text",
				text: c.text
			});
			else if ("toolResult" in c) content.push({
				type: "tool_result",
				toolResult: c.toolResult
			});
			else if ("toolUse" in c && c.toolUse && c.toolUse.name && c.toolUse.input && typeof c.toolUse.input === "object") toolCalls.push({
				id: c.toolUse.toolUseId,
				name: c.toolUse.name,
				args: c.toolUse.input,
				type: "tool_call"
			});
			else if ("video" in c) content.push({
				type: "video",
				video: c.video
			});
		});
		return new __langchain_core_messages.AIMessage({
			content: content.length ? content : "",
			tool_calls: toolCalls.length ? toolCalls : void 0,
			response_metadata: {
				...responseMetadata,
				model_provider: "bedrock-converse"
			},
			usage_metadata: tokenUsage,
			id: requestId
		});
	}
}
function handleConverseStreamContentBlockDelta(contentBlockDelta) {
	if (!contentBlockDelta.delta) throw new Error("No delta found in content block.");
	if (typeof contentBlockDelta.delta.text === "string") return new __langchain_core_outputs.ChatGenerationChunk({
		text: contentBlockDelta.delta.text,
		message: new __langchain_core_messages.AIMessageChunk({ content: contentBlockDelta.delta.text })
	});
	else if (contentBlockDelta.delta.toolUse) {
		const index = contentBlockDelta.contentBlockIndex;
		return new __langchain_core_outputs.ChatGenerationChunk({
			text: "",
			message: new __langchain_core_messages.AIMessageChunk({
				content: "",
				tool_call_chunks: [{
					args: contentBlockDelta.delta.toolUse.input,
					index,
					type: "tool_call_chunk"
				}]
			})
		});
	} else if (contentBlockDelta.delta.reasoningContent) return new __langchain_core_outputs.ChatGenerationChunk({
		text: "",
		message: new __langchain_core_messages.AIMessageChunk({ content: [bedrockReasoningDeltaToLangchainPartialReasoningBlock(contentBlockDelta.delta.reasoningContent)] })
	});
	else throw new Error(`Unsupported content block type(s): ${JSON.stringify(contentBlockDelta.delta, null, 2)}`);
}
function handleConverseStreamContentBlockStart(contentBlockStart) {
	const index = contentBlockStart.contentBlockIndex;
	if (contentBlockStart.start?.toolUse) return new __langchain_core_outputs.ChatGenerationChunk({
		text: "",
		message: new __langchain_core_messages.AIMessageChunk({
			content: "",
			tool_call_chunks: [{
				name: contentBlockStart.start.toolUse.name,
				id: contentBlockStart.start.toolUse.toolUseId,
				index,
				type: "tool_call_chunk"
			}]
		})
	});
	throw new Error("Unsupported content block start event.");
}
function handleConverseStreamMetadata(metadata, extra) {
	const inputTokens = metadata.usage?.inputTokens ?? 0;
	const outputTokens = metadata.usage?.outputTokens ?? 0;
	const usage_metadata = {
		input_tokens: inputTokens,
		output_tokens: outputTokens,
		total_tokens: metadata.usage?.totalTokens ?? inputTokens + outputTokens
	};
	return new __langchain_core_outputs.ChatGenerationChunk({
		text: "",
		message: new __langchain_core_messages.AIMessageChunk({
			content: "",
			usage_metadata: extra.streamUsage ? usage_metadata : void 0,
			response_metadata: {
				metadata,
				model_provider: "bedrock-converse"
			}
		})
	});
}
function bedrockReasoningDeltaToLangchainPartialReasoningBlock(reasoningContent) {
	const { text, redactedContent, signature } = reasoningContent;
	if (typeof text === "string") return {
		type: "reasoning_content",
		reasoningText: { text }
	};
	if (signature) return {
		type: "reasoning_content",
		reasoningText: { signature }
	};
	if (redactedContent) return {
		type: "reasoning_content",
		redactedContent: Buffer.from(redactedContent).toString("base64")
	};
	throw new Error("Invalid reasoning content");
}
function bedrockReasoningBlockToLangchainReasoningBlock(reasoningContent) {
	const { reasoningText, redactedContent } = reasoningContent;
	if (reasoningText) return {
		type: "reasoning_content",
		reasoningText
	};
	if (redactedContent) return {
		type: "reasoning_content",
		redactedContent: Buffer.from(redactedContent).toString("base64")
	};
	throw new Error("Invalid reasoning content");
}

//#endregion
exports.convertConverseMessageToLangChainMessage = convertConverseMessageToLangChainMessage;
exports.handleConverseStreamContentBlockDelta = handleConverseStreamContentBlockDelta;
exports.handleConverseStreamContentBlockStart = handleConverseStreamContentBlockStart;
exports.handleConverseStreamMetadata = handleConverseStreamMetadata;
//# sourceMappingURL=message_outputs.cjs.map