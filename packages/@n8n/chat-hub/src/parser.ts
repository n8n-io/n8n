import {
	chatHubMessageWithButtonsSchema,
	type ChatHubMessageType,
	type ChatMessageContentChunk,
} from '@n8n/api-types';

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
			(lastItem.type === 'artifact-create' || lastItem.type === 'artifact-edit') &&
			lastItem.isIncomplete
		) {
			// Incomplete command - append chunk and re-parse
			// Don't mutate the original item, create new content string
			remaining = lastItem.content + chunk;
			result.pop(); // Remove it so we can re-parse
		}
	}

	// Check if the chunk is button JSON (arrives as complete JSON in one chunk)
	const buttonChunk = tryParseButtonsJson(remaining);
	if (buttonChunk) {
		result.push(buttonChunk);
		return result;
	}

	// Parse the remaining content
	let currentPos = 0;
	const createCommandRegex = /<command:artifact-create>/g;
	const editCommandRegex = /<command:artifact-edit>/g;

	while (currentPos < remaining.length) {
		// Find the next command
		createCommandRegex.lastIndex = currentPos;
		editCommandRegex.lastIndex = currentPos;

		const createMatch = createCommandRegex.exec(remaining);
		const editMatch = editCommandRegex.exec(remaining);

		let nextMatch: RegExpExecArray | null = null;
		let commandType: 'create' | 'edit' | null = null;

		if (createMatch && editMatch) {
			// Both found, use the earlier one
			if (createMatch.index < editMatch.index) {
				nextMatch = createMatch;
				commandType = 'create';
			} else {
				nextMatch = editMatch;
				commandType = 'edit';
			}
		} else if (createMatch) {
			nextMatch = createMatch;
			commandType = 'create';
		} else if (editMatch) {
			nextMatch = editMatch;
			commandType = 'edit';
		}

		if (!nextMatch || !commandType) {
			// No more commands, rest is text
			const textContent = remaining.slice(currentPos);
			if (textContent) {
				// Split text and potential command prefix
				const { text, hiddenPrefix } = splitPotentialCommandPrefix(textContent);
				if (text) {
					addTextToResult(result, text);
				}
				if (hiddenPrefix) {
					result.push({ type: 'hidden', content: hiddenPrefix });
				}
			}
			break;
		}

		// Add text before the command
		if (nextMatch.index > currentPos) {
			const textContent = remaining.slice(currentPos, nextMatch.index);
			addTextToResult(result, textContent);
		}

		// Parse the command
		const commandStart = nextMatch.index;
		const commandContent = remaining.slice(commandStart);

		if (commandType === 'create') {
			const parsed = parseArtifactCreateCommand(commandContent);
			result.push(parsed.item);
			currentPos = commandStart + parsed.consumed;
		} else {
			const parsed = parseArtifactEditCommand(commandContent);
			result.push(parsed.item);
			currentPos = commandStart + parsed.consumed;
		}
	}

	return result;
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
	const commandTags = ['<command:artifact-create>', '<command:artifact-edit>'];

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
	item: ChatMessageContentChunk;
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
	item: ChatMessageContentChunk;
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

function tryParseButtonsJson(content: string): ChatMessageContentChunk | null {
	if (!content.startsWith('{')) return null;

	try {
		const parsed: unknown = JSON.parse(content);
		const result = chatHubMessageWithButtonsSchema.safeParse(parsed);
		if (result.success) {
			return {
				type: 'with-buttons',
				content: result.data.text,
				buttons: result.data.buttons,
				blockUserInput: result.data.blockUserInput,
			};
		}
	} catch {
		// Not valid JSON
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
