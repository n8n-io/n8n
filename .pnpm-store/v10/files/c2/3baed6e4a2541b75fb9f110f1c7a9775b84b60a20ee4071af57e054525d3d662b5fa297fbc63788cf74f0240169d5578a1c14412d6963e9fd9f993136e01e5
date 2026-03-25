const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/xai.ts
/**
* Converts an xAI AI message to an array of v1 standard content blocks.
*
* This function processes an AI message from xAI's API format
* and converts it to the standardized v1 content block format. It handles
* both the responses API (reasoning object with summary) and completions API
* (reasoning_content string) formats.
*
* @param message - The AI message containing xAI-formatted content
* @returns Array of content blocks in v1 standard format
*
* @example
* ```typescript
* // Responses API format
* const message = new AIMessage({
*   content: "The answer is 42",
*   additional_kwargs: {
*     reasoning: {
*       id: "reasoning_123",
*       type: "reasoning",
*       summary: [{ type: "summary_text", text: "Let me think..." }]
*     }
*   }
* });
* const standardBlocks = convertToV1FromXAIMessage(message);
* // Returns:
* // [
* //   { type: "reasoning", reasoning: "Let me think..." },
* //   { type: "text", text: "The answer is 42" }
* // ]
* ```
*
* @example
* ```typescript
* // Completions API format
* const message = new AIMessage({
*   content: "The answer is 42",
*   additional_kwargs: { reasoning_content: "Let me think about this..." }
* });
* const standardBlocks = convertToV1FromXAIMessage(message);
* // Returns:
* // [
* //   { type: "reasoning", reasoning: "Let me think about this..." },
* //   { type: "text", text: "The answer is 42" }
* // ]
* ```
*/
function convertToV1FromXAIMessage(message) {
	const blocks = [];
	if (require_utils._isObject(message.additional_kwargs?.reasoning)) {
		const reasoning = message.additional_kwargs.reasoning;
		if (require_utils._isArray(reasoning.summary)) {
			const summaryText = reasoning.summary.reduce((acc, item) => {
				if (require_utils._isObject(item) && require_utils._isString(item.text)) return `${acc}${item.text}`;
				return acc;
			}, "");
			if (summaryText.length > 0) blocks.push({
				type: "reasoning",
				reasoning: summaryText
			});
		}
	}
	const reasoningContent = message.additional_kwargs?.reasoning_content;
	if (require_utils._isString(reasoningContent) && reasoningContent.length > 0) blocks.push({
		type: "reasoning",
		reasoning: reasoningContent
	});
	if (typeof message.content === "string") {
		if (message.content.length > 0) blocks.push({
			type: "text",
			text: message.content
		});
	} else for (const block of message.content) if (typeof block === "object" && "type" in block && block.type === "text" && "text" in block && require_utils._isString(block.text)) blocks.push({
		type: "text",
		text: block.text
	});
	for (const toolCall of message.tool_calls ?? []) blocks.push({
		type: "tool_call",
		id: toolCall.id,
		name: toolCall.name,
		args: toolCall.args
	});
	return blocks;
}
const ChatXAITranslator = {
	translateContent: convertToV1FromXAIMessage,
	translateContentChunk: convertToV1FromXAIMessage
};
//#endregion
exports.ChatXAITranslator = ChatXAITranslator;

//# sourceMappingURL=xai.cjs.map