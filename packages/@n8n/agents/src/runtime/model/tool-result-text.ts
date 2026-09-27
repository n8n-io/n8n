import type { ModelMessage, ToolResultPart } from 'ai';

/**
 * Append trusted text parts after a tool result's own output. Text and JSON
 * outputs become content parts so the appended text is a separate block from
 * the (possibly untrusted-wrapped) tool output. Error outputs are left alone.
 */
export function appendToolResultText(part: ToolResultPart, texts: string[]): ToolResultPart {
	const extra = texts.map((text) => ({ type: 'text' as const, text }));
	const { output } = part;
	switch (output.type) {
		case 'content':
			return { ...part, output: { type: 'content', value: [...output.value, ...extra] } };
		case 'text':
			return {
				...part,
				output: { type: 'content', value: [{ type: 'text', text: output.value }, ...extra] },
			};
		case 'json':
			return {
				...part,
				output: {
					type: 'content',
					value: [{ type: 'text', text: JSON.stringify(output.value) }, ...extra],
				},
			};
		default:
			return part;
	}
}

/** Append `text` to the result of the tool call `toolCallId`. Other messages are returned as-is. */
export function appendToToolResult(
	messages: ModelMessage[],
	toolCallId: string,
	text: string,
): ModelMessage[] {
	return messages.map((message) => {
		if (message.role !== 'tool') return message;
		if (!message.content.some((part) => isResultFor(part, toolCallId))) return message;
		return {
			...message,
			content: message.content.map((part) =>
				isResultFor(part, toolCallId) ? appendToolResultText(part, [text]) : part,
			),
		};
	});
}

function isResultFor(
	part: Extract<ModelMessage, { role: 'tool' }>['content'][number],
	toolCallId: string,
): part is ToolResultPart {
	return part.type === 'tool-result' && part.toolCallId === toolCallId;
}
