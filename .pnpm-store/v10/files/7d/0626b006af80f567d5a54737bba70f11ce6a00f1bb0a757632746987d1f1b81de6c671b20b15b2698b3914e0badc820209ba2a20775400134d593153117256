import { _isString } from "./utils.js";
//#region src/messages/block_translators/ollama.ts
/**
* Converts an Ollama AI message to an array of v1 standard content blocks.
*
* This function processes an AI message from Ollama's API format
* and converts it to the standardized v1 content block format. It handles
* the reasoning_content in additional_kwargs (populated when think mode is enabled).
*
* @param message - The AI message containing Ollama-formatted content
* @returns Array of content blocks in v1 standard format
*
* @example
* ```typescript
* const message = new AIMessage({
*   content: "The answer is 42",
*   additional_kwargs: { reasoning_content: "Let me think about this..." }
* });
* const standardBlocks = convertToV1FromOllamaMessage(message);
* // Returns:
* // [
* //   { type: "reasoning", reasoning: "Let me think about this..." },
* //   { type: "text", text: "The answer is 42" }
* // ]
* ```
*/
function convertToV1FromOllamaMessage(message) {
	const blocks = [];
	const reasoningContent = message.additional_kwargs?.reasoning_content;
	if (_isString(reasoningContent) && reasoningContent.length > 0) blocks.push({
		type: "reasoning",
		reasoning: reasoningContent
	});
	if (typeof message.content === "string") {
		if (message.content.length > 0) blocks.push({
			type: "text",
			text: message.content
		});
	} else for (const block of message.content) if (typeof block === "object" && "type" in block && block.type === "text" && "text" in block && _isString(block.text)) blocks.push({
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
const ChatOllamaTranslator = {
	translateContent: convertToV1FromOllamaMessage,
	translateContentChunk: convertToV1FromOllamaMessage
};
//#endregion
export { ChatOllamaTranslator };

//# sourceMappingURL=ollama.js.map