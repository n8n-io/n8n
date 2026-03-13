import {
	chatHubMessageWithButtonsSchema,
	type ChatHubMessageType,
	type ChatMessageContentChunk,
} from '@n8n/api-types';

export interface MessageWithContent {
	type: ChatHubMessageType;
	content: string;
}

const CREATE_TAG = '@@artifact-create ';
const EDIT_TAG = '@@artifact-edit ';
const SEP_MARKER = '@@sep';

export function appendChunkToParsedMessageItems(
	items: ChatMessageContentChunk[],
	chunk: string,
): ChatMessageContentChunk[] {
	const result = [...items];
	let remaining = chunk;

	// If the last item is incomplete, prepend its raw content and re-parse
	if (result.length > 0) {
		const lastItem = result[result.length - 1];
		if (lastItem.type === 'hidden') {
			remaining = lastItem.content + chunk;
			result.pop();
		} else if (
			(lastItem.type === 'artifact-create' || lastItem.type === 'artifact-edit') &&
			lastItem.isIncomplete
		) {
			remaining = lastItem.content + chunk;
			result.pop();
		}
	}

	// Check if the chunk is button JSON (arrives as complete JSON in one chunk)
	const buttonChunk = tryParseButtonsJson(remaining);
	if (buttonChunk) {
		result.push(buttonChunk);
		return result;
	}

	let currentPos = 0;

	while (currentPos < remaining.length) {
		const createIdx = findLineStartCommand(remaining, currentPos, CREATE_TAG);
		const editIdx = findLineStartCommand(remaining, currentPos, EDIT_TAG);

		let nextIdx = -1;
		let commandType: 'create' | 'edit' | null = null;

		if (createIdx !== -1 && editIdx !== -1) {
			if (createIdx <= editIdx) {
				nextIdx = createIdx;
				commandType = 'create';
			} else {
				nextIdx = editIdx;
				commandType = 'edit';
			}
		} else if (createIdx !== -1) {
			nextIdx = createIdx;
			commandType = 'create';
		} else if (editIdx !== -1) {
			nextIdx = editIdx;
			commandType = 'edit';
		}

		if (nextIdx === -1 || commandType === null) {
			// No more commands — emit remaining as text, buffering any potential command prefix
			const textContent = remaining.slice(currentPos);
			if (textContent) {
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

		// Emit text before the command
		if (nextIdx > currentPos) {
			addTextToResult(result, remaining.slice(currentPos, nextIdx));
		}

		const commandContent = remaining.slice(nextIdx);

		if (commandType === 'create') {
			const parsed = parseArtifactCreateCommand(commandContent);
			result.push(parsed.item);
			currentPos = nextIdx + parsed.consumed;
		} else {
			const parsed = parseArtifactEditCommand(commandContent);
			result.push(parsed.item);
			currentPos = nextIdx + parsed.consumed;
		}
	}

	return result;
}

function addTextToResult(result: ChatMessageContentChunk[], textContent: string): void {
	if (textContent === '') {
		return;
	}
	if (result.length > 0) {
		const lastItem = result[result.length - 1];
		if (lastItem.type === 'text') {
			result[result.length - 1] = { type: 'text', content: lastItem.content + textContent };
			return;
		}
	}
	result.push({ type: 'text', content: textContent });
}

/**
 * Find the first occurrence of `tag` that starts at a line boundary
 * (position 0 or immediately after a newline), starting search from `startPos`.
 */
function findLineStartCommand(text: string, startPos: number, tag: string): number {
	let pos = startPos;
	while (pos < text.length) {
		const idx = text.indexOf(tag, pos);
		if (idx === -1) return -1;
		if (idx === 0 || text[idx - 1] === '\n') return idx;
		pos = idx + 1;
	}
	return -1;
}

/**
 * Skip from `pos` past any trailing characters on the current line to the start
 * of the next line. Returns `text.length` if there is no following newline.
 */
function skipToNextLine(text: string, pos: number): number {
	const nextNewline = text.indexOf('\n', pos);
	return nextNewline === -1 ? text.length : nextNewline + 1;
}

/**
 * Find the first occurrence of `marker` that occupies an entire line
 * (starts at a line boundary and is followed by `\n` or end of string).
 * Returns the index where the marker starts, or -1.
 */
function findFirstLineMarker(text: string, startPos: number, marker: string): number {
	const isFullLine = (idx: number) => {
		const after = idx + marker.length;
		return after >= text.length || text[after] === '\n';
	};

	if (text.startsWith(marker, startPos) && isFullLine(startPos)) {
		return startPos;
	}

	let searchFrom = startPos;
	while (true) {
		const idx = text.indexOf('\n' + marker, searchFrom);
		if (idx === -1) return -1;
		const markerIdx = idx + 1;
		if (isFullLine(markerIdx)) return markerIdx;
		searchFrom = markerIdx;
	}
}

function parseOpeningLineAttributes(line: string): Record<string, string> {
	const result: Record<string, string> = {};
	const attrRegex = /(\w+)="([^"]*)"/g;
	let match = attrRegex.exec(line);
	while (match !== null) {
		result[match[1]] = match[2];
		match = attrRegex.exec(line);
	}
	return result;
}

function parseEndToken(line: string): string {
	const match = /<<\s*(\S+)/.exec(line);
	return match ? match[1] : '';
}

function parseArtifactCreateCommand(content: string): {
	item: ChatMessageContentChunk;
	consumed: number;
} {
	const firstNewline = content.indexOf('\n');
	const openingLine = firstNewline === -1 ? content : content.slice(0, firstNewline);
	const attrs = parseOpeningLineAttributes(openingLine);
	const title = attrs.title ?? '';
	const type = attrs.type ?? '';
	const endToken = parseEndToken(openingLine);

	const bodyStart = firstNewline === -1 ? content.length : firstNewline + 1;
	const endIdx = endToken ? findFirstLineMarker(content, bodyStart, endToken) : -1;
	const isIncomplete = endIdx === -1;

	let documentContent = '';
	let consumed: number;

	if (firstNewline === -1) {
		// Only the opening line received so far
		consumed = content.length;
	} else if (isIncomplete) {
		documentContent = content.slice(bodyStart);
		consumed = content.length;
	} else {
		// Content is between the opening line's \n and the \n preceding TOKEN
		documentContent = content.slice(bodyStart, endIdx - 1);
		consumed = skipToNextLine(content, endIdx + endToken.length);
	}

	return {
		item: {
			type: 'artifact-create',
			content: content.slice(0, consumed),
			command: { title, type, content: documentContent },
			isIncomplete,
		},
		consumed,
	};
}

function parseArtifactEditCommand(content: string): {
	item: ChatMessageContentChunk;
	consumed: number;
} {
	const firstNewline = content.indexOf('\n');
	const openingLine = firstNewline === -1 ? content : content.slice(0, firstNewline);
	const attrs = parseOpeningLineAttributes(openingLine);
	const title = attrs.title ?? '';
	const replaceAllStr = attrs.replaceAll ?? 'false';
	const replaceAll = replaceAllStr.toLowerCase() === 'true';
	const endToken = parseEndToken(openingLine);

	const bodyStart = firstNewline === -1 ? content.length : firstNewline + 1;
	const endIdx = endToken ? findFirstLineMarker(content, bodyStart, endToken) : -1;
	const sepIdx = findFirstLineMarker(content, bodyStart, SEP_MARKER);
	const isIncomplete = endIdx === -1;

	let oldString = '';
	let newString = '';
	let consumed: number;

	if (firstNewline === -1) {
		// Only the opening line received so far
		consumed = content.length;
	} else if (isIncomplete) {
		if (sepIdx === -1) {
			oldString = content.slice(bodyStart);
		} else {
			oldString = content.slice(bodyStart, sepIdx - 1);
			newString = content.slice(skipToNextLine(content, sepIdx + SEP_MARKER.length));
		}
		consumed = content.length;
	} else {
		if (sepIdx !== -1 && sepIdx < endIdx) {
			oldString = content.slice(bodyStart, sepIdx - 1);
			newString = content.slice(skipToNextLine(content, sepIdx + SEP_MARKER.length), endIdx - 1);
		} else {
			oldString = content.slice(bodyStart, endIdx - 1);
		}
		consumed = skipToNextLine(content, endIdx + endToken.length);
	}

	return {
		item: {
			type: 'artifact-edit',
			content: content.slice(0, consumed),
			command: { title, oldString, newString, replaceAll },
			isIncomplete,
		},
		consumed,
	};
}

/**
 * If the end of `text` looks like the start of a command tag at a line boundary,
 * split it off as a hidden prefix to be re-evaluated with the next chunk.
 */
function splitPotentialCommandPrefix(text: string): {
	text: string;
	hiddenPrefix: string;
} {
	const commandTags = [CREATE_TAG, EDIT_TAG];

	for (let len = 1; len <= Math.min(text.length, 18); len++) {
		const suffix = text.slice(-len);
		const splitPos = text.length - len;

		for (const tag of commandTags) {
			if (tag.startsWith(suffix) && (splitPos === 0 || text[splitPos - 1] === '\n')) {
				return {
					text: text.slice(0, splitPos),
					hiddenPrefix: suffix,
				};
			}
		}
	}

	return { text, hiddenPrefix: '' };
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
 * Parse a complete message into content chunks.
 * Non-AI messages are returned as plain text.
 */
export function parseMessage(message: MessageWithContent): ChatMessageContentChunk[] {
	if (message.type !== 'ai') {
		return [{ type: 'text' as const, content: message.content }];
	}

	if (message.content.includes('<command:artifact-')) {
		return parseLegacyMessage(message.content);
	}

	return appendChunkToParsedMessageItems([], message.content);
}

// ── Legacy XML parser (for messages stored with the old <command:artifact-*> syntax) ──

function extractTagContent(xml: string, tagName: string): string | null {
	const openTag = `<${tagName}>`;
	const closeTag = `</${tagName}>`;
	const startIndex = xml.indexOf(openTag);
	if (startIndex === -1) {
		return null;
	}
	const contentStart = startIndex + openTag.length;
	const endIndex = xml.indexOf(closeTag, contentStart);
	if (endIndex === -1) {
		let content = xml.slice(contentStart);
		for (let len = 1; len < closeTag.length; len++) {
			const partialCloseTag = closeTag.slice(0, len);
			if (content.endsWith(partialCloseTag)) {
				content = content.slice(0, -len);
				break;
			}
		}
		return content.length > 0 ? content : null;
	}
	return xml.slice(contentStart, endIndex);
}

function parseLegacyCreateCommand(content: string): {
	item: ChatMessageContentChunk;
	consumed: number;
} {
	const closingTag = '</command:artifact-create>';
	const closingIndex = content.indexOf(closingTag);
	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + closingTag.length);
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

function parseLegacyEditCommand(content: string): {
	item: ChatMessageContentChunk;
	consumed: number;
} {
	const closingTag = '</command:artifact-edit>';
	const closingIndex = content.indexOf(closingTag);
	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + closingTag.length);
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

function parseLegacyMessage(content: string): ChatMessageContentChunk[] {
	const result: ChatMessageContentChunk[] = [];
	let currentPos = 0;
	const createCommandRegex = /<command:artifact-create>/g;
	const editCommandRegex = /<command:artifact-edit>/g;

	while (currentPos < content.length) {
		createCommandRegex.lastIndex = currentPos;
		editCommandRegex.lastIndex = currentPos;
		const createMatch = createCommandRegex.exec(content);
		const editMatch = editCommandRegex.exec(content);

		let nextMatch: RegExpExecArray | null = null;
		let commandType: 'create' | 'edit' | null = null;

		if (createMatch && editMatch) {
			if (createMatch.index <= editMatch.index) {
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
			const text = content.slice(currentPos);
			if (text) {
				addTextToResult(result, text);
			}
			break;
		}

		if (nextMatch.index > currentPos) {
			addTextToResult(result, content.slice(currentPos, nextMatch.index));
		}

		const commandContent = content.slice(nextMatch.index);
		if (commandType === 'create') {
			const parsed = parseLegacyCreateCommand(commandContent);
			result.push(parsed.item);
			currentPos = nextMatch.index + parsed.consumed;
		} else {
			const parsed = parseLegacyEditCommand(commandContent);
			result.push(parsed.item);
			currentPos = nextMatch.index + parsed.consumed;
		}
	}

	return result;
}
