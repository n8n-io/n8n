import {
	chatHubMessageCardsSchema,
	chatHubMessageWithButtonsSchema,
	resultCardSchema,
	type ChatHubMessageType,
	type ChatMessageContentChunk,
	type ResultCard,
} from '@n8n/api-types';

import { RESULT_CARD_COMMAND_CLOSE, RESULT_CARD_COMMAND_OPEN } from './constants';

const COMMAND_TAGS = [
	{ kind: 'create', open: '<command:artifact-create>' },
	{ kind: 'edit', open: '<command:artifact-edit>' },
	{ kind: 'card', open: RESULT_CARD_COMMAND_OPEN },
] as const;
type CommandKind = (typeof COMMAND_TAGS)[number]['kind'];

export interface MessageWithContent {
	type: ChatHubMessageType;
	content: string;
}

export function appendChunkToParsedMessageItems(
	items: ChatMessageContentChunk[],
	chunk: string,
): ChatMessageContentChunk[] {
	const result = [...items];
	let remaining = chunk;

	// If the last item is incomplete, append to it and re-parse
	if (result.length > 0) {
		const lastItem = result[result.length - 1];
		if (lastItem.type === 'hidden') {
			// Hidden item might be a command prefix, combine with new chunk and re-parse
			remaining = lastItem.content + chunk;
			result.pop(); // Remove it so we can re-parse
		} else if (
			(lastItem.type === 'artifact-create' ||
				lastItem.type === 'artifact-edit' ||
				lastItem.type === 'card') &&
			lastItem.isIncomplete
		) {
			// Incomplete command - append chunk and re-parse
			// Don't mutate the original item, create new content string
			remaining = lastItem.content + chunk;
			result.pop(); // Remove it so we can re-parse
		}
	}

	// Check if the chunk is a whole-message JSON form (buttons or cards; arrives as complete JSON in one chunk)
	const wholeMessageChunks = tryParseWholeMessageJson(remaining);
	if (wholeMessageChunks) {
		result.push(...wholeMessageChunks);
		return result;
	}

	// Parse the remaining content
	let currentPos = 0;

	while (currentPos < remaining.length) {
		const next = findNextCommand(remaining, currentPos);

		if (!next) {
			const textContent = remaining.slice(currentPos);
			if (textContent) {
				const { text, hiddenPrefix } = splitPotentialCommandPrefix(textContent);
				if (text) addTextToResult(result, text);
				if (hiddenPrefix) result.push({ type: 'hidden', content: hiddenPrefix });
			}
			break;
		}

		if (next.index > currentPos) {
			addTextToResult(result, remaining.slice(currentPos, next.index));
		}

		const commandContent = remaining.slice(next.index);
		const parsed =
			next.kind === 'create'
				? parseArtifactCreateCommand(commandContent)
				: next.kind === 'edit'
					? parseArtifactEditCommand(commandContent)
					: parseCardCommand(commandContent);
		if (parsed.item) result.push(parsed.item);
		currentPos = next.index + parsed.consumed;
	}

	return result;
}

function findNextCommand(
	content: string,
	from: number,
): { index: number; kind: CommandKind } | null {
	let best: { index: number; kind: CommandKind } | null = null;
	for (const tag of COMMAND_TAGS) {
		const index = content.indexOf(tag.open, from);
		if (index !== -1 && (best === null || index < best.index)) {
			best = { index, kind: tag.kind };
		}
	}
	return best;
}

function addTextToResult(result: ChatMessageContentChunk[], textContent: string): void {
	// Skip empty text (but preserve whitespace like newlines, which are meaningful in markdown)
	if (textContent === '') {
		return;
	}

	if (result.length > 0) {
		const lastItem = result[result.length - 1];
		if (lastItem.type === 'text') {
			// Don't mutate the original item, create a new one
			result[result.length - 1] = { type: 'text', content: lastItem.content + textContent };
			return;
		}
	}
	result.push({ type: 'text', content: textContent });
}

function splitPotentialCommandPrefix(text: string): {
	text: string;
	hiddenPrefix: string;
} {
	const commandTags = COMMAND_TAGS.map((tag) => tag.open);

	// Check if the end of text matches any prefix of a command tag
	for (let len = 1; len <= Math.min(text.length, 30); len++) {
		const suffix = text.slice(-len);

		// Check if this suffix is a prefix of any command tag
		for (const tag of commandTags) {
			if (tag.startsWith(suffix)) {
				// Found a potential command prefix, split it
				return {
					text: text.slice(0, -len),
					hiddenPrefix: suffix,
				};
			}
		}
	}

	return { text, hiddenPrefix: '' };
}

function parseArtifactCreateCommand(content: string): {
	item: ChatMessageContentChunk | null;
	consumed: number;
} {
	const closingTag = '</command:artifact-create>';
	const closingIndex = content.indexOf(closingTag);

	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + closingTag.length);

	// Extract fields even if incomplete
	const title = extractTagContent(commandContent, 'title') ?? '';
	const type = extractTagContent(commandContent, 'type') ?? '';
	const contentField = extractTagContent(commandContent, 'content') ?? '';

	return {
		item: {
			type: 'artifact-create',
			content: commandContent,
			command: { title, type, content: contentField },
			isIncomplete,
		},
		consumed: commandContent.length,
	};
}

function parseArtifactEditCommand(content: string): {
	item: ChatMessageContentChunk | null;
	consumed: number;
} {
	const closingTag = '</command:artifact-edit>';
	const closingIndex = content.indexOf(closingTag);

	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + closingTag.length);

	// Extract fields even if incomplete
	const title = extractTagContent(commandContent, 'title') ?? '';
	const oldString = extractTagContent(commandContent, 'oldString') ?? '';
	const newString = extractTagContent(commandContent, 'newString') ?? '';
	const replaceAllStr = extractTagContent(commandContent, 'replaceAll') ?? 'false';
	const replaceAll = replaceAllStr.toLowerCase() === 'true';

	return {
		item: {
			type: 'artifact-edit',
			content: commandContent,
			command: { title, oldString, newString, replaceAll },
			isIncomplete,
		},
		consumed: commandContent.length,
	};
}

function parseCardCommand(content: string): {
	item: ChatMessageContentChunk | null;
	consumed: number;
} {
	const closingIndex = content.indexOf(RESULT_CARD_COMMAND_CLOSE);
	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + RESULT_CARD_COMMAND_CLOSE.length);

	if (isIncomplete) {
		return {
			item: { type: 'card', content: commandContent, card: null, isIncomplete: true },
			consumed: commandContent.length,
		};
	}

	const card = parseResultCardJson(
		commandContent.slice(RESULT_CARD_COMMAND_OPEN.length, closingIndex),
	);
	return {
		item: card ? { type: 'card', content: commandContent, card, isIncomplete: false } : null,
		consumed: commandContent.length,
	};
}

function parseResultCardJson(json: string): ResultCard | null {
	try {
		const result = resultCardSchema.safeParse(JSON.parse(json));
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

function extractTagContent(xml: string, tagName: string): string | null {
	const openTag = `<${tagName}>`;
	const closeTag = `</${tagName}>`;

	const startIndex = xml.indexOf(openTag);
	if (startIndex === -1) {
		return null;
	}

	const contentStart = startIndex + openTag.length;
	const endIndex = xml.indexOf(closeTag, contentStart);

	// If closing tag not found, return content from open tag to end of string
	if (endIndex === -1) {
		let content = xml.slice(contentStart);

		// Check if content ends with a partial closing tag and exclude it
		// A partial closing tag looks like: </, </t, </ti, </tit, etc.
		for (let len = 1; len < closeTag.length; len++) {
			const partialCloseTag = closeTag.slice(0, len);
			if (content.endsWith(partialCloseTag)) {
				content = content.slice(0, -len);
				break;
			}
		}

		// Only return if there's actual content after the opening tag
		return content.length > 0 ? content : null;
	}

	return xml.slice(contentStart, endIndex);
}

function tryParseWholeMessageJson(content: string): ChatMessageContentChunk[] | null {
	if (!content.startsWith('{')) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		return null;
	}

	const buttons = chatHubMessageWithButtonsSchema.safeParse(parsed);
	if (buttons.success) {
		return [
			{
				type: 'with-buttons',
				content: buttons.data.text,
				buttons: buttons.data.buttons,
				blockUserInput: buttons.data.blockUserInput,
			},
		];
	}

	const cards = chatHubMessageCardsSchema.safeParse(parsed);
	if (cards.success) {
		const chunks: ChatMessageContentChunk[] = [];
		if (cards.data.text) chunks.push({ type: 'text', content: cards.data.text });
		for (const card of cards.data.cards) {
			chunks.push({ type: 'card', content: JSON.stringify(card), card, isIncomplete: false });
		}
		return chunks;
	}

	const card = resultCardSchema.safeParse(parsed);
	if (card.success) {
		return [{ type: 'card', content, card: card.data, isIncomplete: false }];
	}

	return null;
}

/**
 * Parse a message and extract all content (text and commands)
 * Returns an array of parsed items in order, including text segments
 * Incomplete commands (without closing tags) are marked as isComplete: false
 */
export function parseMessage(message: MessageWithContent): ChatMessageContentChunk[] {
	if (message.type !== 'ai') {
		return [{ type: 'text' as const, content: message.content }];
	}

	return appendChunkToParsedMessageItems([], message.content);
}
