import type { MessageContent, MessageContentText } from '@langchain/core/messages';

/**
 * Flattens LangChain message content into plain text, keeping only text blocks.
 *
 * Providers may return a content-block array alongside tool calls, so callers that
 * need a string cannot read `content` directly without risking an array.
 */
export function extractMessageText(content: MessageContent | undefined): string {
	if (typeof content === 'string') {
		return content;
	}

	if (!Array.isArray(content)) {
		return '';
	}

	let text = '';
	for (const block of content) {
		if (block?.type === 'text') {
			text += (block as MessageContentText)?.text ?? '';
		}
	}

	return text;
}
