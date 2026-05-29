export type InstanceAiMarkdownChunk =
	| { type: 'text'; content: string }
	| { type: 'hidden'; content: string }
	| {
			type: 'artifact-create';
			content: string;
			command: { title: string; type: string; content: string };
			isIncomplete: boolean;
	  }
	| {
			type: 'artifact-edit';
			content: string;
			command: { title: string; oldString: string; newString: string; replaceAll: boolean };
			isIncomplete: boolean;
	  };

type ParsedCommand = {
	item: InstanceAiMarkdownChunk;
	consumed: number;
};

export function parseInstanceAiMarkdown(content: string): InstanceAiMarkdownChunk[] {
	return appendChunkToParsedInstanceAiMarkdown([], content);
}

export function appendChunkToParsedInstanceAiMarkdown(
	items: InstanceAiMarkdownChunk[],
	chunk: string,
): InstanceAiMarkdownChunk[] {
	const result = [...items];
	let remaining = chunk;

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

	let currentPos = 0;
	const createCommandRegex = /<command:artifact-create>/g;
	const editCommandRegex = /<command:artifact-edit>/g;

	while (currentPos < remaining.length) {
		createCommandRegex.lastIndex = currentPos;
		editCommandRegex.lastIndex = currentPos;

		const createMatch = createCommandRegex.exec(remaining);
		const editMatch = editCommandRegex.exec(remaining);
		const nextCommand = getNextCommand(createMatch, editMatch);

		if (!nextCommand) {
			const textContent = remaining.slice(currentPos);
			if (textContent) {
				const { text, hiddenPrefix } = splitPotentialCommandPrefix(textContent);
				if (text) addTextToResult(result, text);
				if (hiddenPrefix) result.push({ type: 'hidden', content: hiddenPrefix });
			}
			break;
		}

		if (nextCommand.match.index > currentPos) {
			addTextToResult(result, remaining.slice(currentPos, nextCommand.match.index));
		}

		const commandStart = nextCommand.match.index;
		const commandContent = remaining.slice(commandStart);
		const parsed =
			nextCommand.type === 'artifact-create'
				? parseArtifactCreateCommand(commandContent)
				: parseArtifactEditCommand(commandContent);

		result.push(parsed.item);
		currentPos = commandStart + parsed.consumed;
	}

	return result;
}

function getNextCommand(
	createMatch: RegExpExecArray | null,
	editMatch: RegExpExecArray | null,
): { type: 'artifact-create' | 'artifact-edit'; match: RegExpExecArray } | undefined {
	if (createMatch && editMatch) {
		return createMatch.index < editMatch.index
			? { type: 'artifact-create', match: createMatch }
			: { type: 'artifact-edit', match: editMatch };
	}

	if (createMatch) return { type: 'artifact-create', match: createMatch };
	if (editMatch) return { type: 'artifact-edit', match: editMatch };

	return undefined;
}

function addTextToResult(result: InstanceAiMarkdownChunk[], textContent: string): void {
	if (textContent === '') return;

	if (result.length > 0) {
		const lastItem = result[result.length - 1];
		if (lastItem.type === 'text') {
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
	const maxTagLength = Math.max(...commandTags.map((tag) => tag.length));

	for (let len = Math.min(text.length, maxTagLength); len >= 1; len--) {
		const suffix = text.slice(-len);

		for (const tag of commandTags) {
			if (tag.startsWith(suffix)) {
				return {
					text: text.slice(0, -len),
					hiddenPrefix: suffix,
				};
			}
		}
	}

	return { text, hiddenPrefix: '' };
}

function parseArtifactCreateCommand(content: string): ParsedCommand {
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

function parseArtifactEditCommand(content: string): ParsedCommand {
	const closingTag = '</command:artifact-edit>';
	const closingIndex = content.indexOf(closingTag);
	const isIncomplete = closingIndex === -1;
	const commandContent = isIncomplete
		? content
		: content.slice(0, closingIndex + closingTag.length);

	const title = extractTagContent(commandContent, 'title') ?? '';
	const oldString = extractTagContent(commandContent, 'oldString') ?? '';
	const newString = extractTagContent(commandContent, 'newString') ?? '';
	const replaceAll =
		(extractTagContent(commandContent, 'replaceAll') ?? 'false').toLowerCase() === 'true';

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

	if (startIndex === -1) return null;

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
