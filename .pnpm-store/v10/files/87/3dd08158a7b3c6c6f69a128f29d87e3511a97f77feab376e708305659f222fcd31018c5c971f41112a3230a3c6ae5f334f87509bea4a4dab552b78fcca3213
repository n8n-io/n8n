import { _isString } from "./utils.js";
//#region src/messages/block_translators/groq.ts
/**
* Converts a Groq AI message to an array of v1 standard content blocks.
*
* This function processes an AI message from Groq's API format
* and converts it to the standardized v1 content block format. It handles
* both parsed reasoning (in additional_kwargs.reasoning) and raw reasoning
* (in <think> tags within content).
*
* @param message - The AI message containing Groq-formatted content
* @returns Array of content blocks in v1 standard format
*
* @example
* ```typescript
* // Parsed format (reasoning_format="parsed")
* const message = new AIMessage({
*   content: "The answer is 42",
*   additional_kwargs: { reasoning: "Let me think about this..." }
* });
* const standardBlocks = convertToV1FromGroqMessage(message);
* // Returns:
* // [
* //   { type: "reasoning", reasoning: "Let me think about this..." },
* //   { type: "text", text: "The answer is 42" }
* // ]
* ```
*
* @example
* ```typescript
* // Raw format (reasoning_format="raw")
* const message = new AIMessage({
*   content: "<think>Let me think...</think>The answer is 42"
* });
* const standardBlocks = convertToV1FromGroqMessage(message);
* // Returns:
* // [
* //   { type: "reasoning", reasoning: "Let me think..." },
* //   { type: "text", text: "The answer is 42" }
* // ]
* ```
*/
function convertToV1FromGroqMessage(message) {
	const blocks = [];
	const parsedReasoning = message.additional_kwargs?.reasoning;
	if (_isString(parsedReasoning) && parsedReasoning.length > 0) blocks.push({
		type: "reasoning",
		reasoning: parsedReasoning
	});
	if (typeof message.content === "string") {
		let textContent = message.content;
		const thinkMatch = textContent.match(/<think>([\s\S]*?)<\/think>/);
		if (thinkMatch) {
			const thinkingContent = thinkMatch[1].trim();
			if (thinkingContent.length > 0) blocks.push({
				type: "reasoning",
				reasoning: thinkingContent
			});
			textContent = textContent.replace(/<think>[\s\S]*?<\/think>/, "").trim();
		}
		if (textContent.length > 0) blocks.push({
			type: "text",
			text: textContent
		});
	} else for (const block of message.content) if (typeof block === "object" && "type" in block && block.type === "text" && "text" in block && _isString(block.text)) {
		let textContent = block.text;
		const thinkMatch = textContent.match(/<think>([\s\S]*?)<\/think>/);
		if (thinkMatch) {
			const thinkingContent = thinkMatch[1].trim();
			if (thinkingContent.length > 0) blocks.push({
				type: "reasoning",
				reasoning: thinkingContent
			});
			textContent = textContent.replace(/<think>[\s\S]*?<\/think>/, "").trim();
		}
		if (textContent.length > 0) blocks.push({
			type: "text",
			text: textContent
		});
	}
	for (const toolCall of message.tool_calls ?? []) blocks.push({
		type: "tool_call",
		id: toolCall.id,
		name: toolCall.name,
		args: toolCall.args
	});
	return blocks;
}
const ChatGroqTranslator = {
	translateContent: convertToV1FromGroqMessage,
	translateContentChunk: convertToV1FromGroqMessage
};
//#endregion
export { ChatGroqTranslator };

//# sourceMappingURL=groq.js.map