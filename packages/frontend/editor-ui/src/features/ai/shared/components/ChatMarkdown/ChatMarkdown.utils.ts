export interface ChatResource {
	type: string;
	id: string;
	name: string;
	projectId?: string;
}

function escapeMarkdownLinkText(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

function isEscaped(content: string, index: number): boolean {
	let backslashCount = 0;
	for (let i = index - 1; i >= 0 && content[i] === '\\'; i--) {
		backslashCount++;
	}
	return backslashCount % 2 === 1;
}

function findCodeSpanEnd(content: string, start: number): number | undefined {
	let tickCount = 0;
	while (content[start + tickCount] === '`') tickCount++;

	const fence = '`'.repeat(tickCount);
	const end = content.indexOf(fence, start + tickCount);
	return end === -1 ? undefined : end + tickCount;
}

function findMarkdownLinkEnd(content: string, start: number): number | undefined {
	let bracketDepth = 1;
	let closeBracketIndex: number | undefined;

	for (let i = start + 1; i < content.length; i++) {
		if (isEscaped(content, i)) continue;
		if (content[i] === '[') {
			bracketDepth++;
		} else if (content[i] === ']') {
			bracketDepth--;
			if (bracketDepth === 0) {
				closeBracketIndex = i;
				break;
			}
		}
	}

	if (closeBracketIndex === undefined || content[closeBracketIndex + 1] !== '(') return undefined;

	let parenDepth = 1;
	for (let i = closeBracketIndex + 2; i < content.length; i++) {
		if (isEscaped(content, i)) continue;
		if (content[i] === '(') {
			parenDepth++;
		} else if (content[i] === ')') {
			parenDepth--;
			if (parenDepth === 0) return i + 1;
		}
	}

	return undefined;
}

function replaceUnprotectedMarkdownText(
	content: string,
	replaceSegment: (segment: string) => string,
): string {
	let result = '';
	let segmentStart = 0;
	let index = 0;

	while (index < content.length) {
		const char = content[index];
		const protectedEnd =
			char === '`'
				? findCodeSpanEnd(content, index)
				: char === '[' && !isEscaped(content, index)
					? findMarkdownLinkEnd(content, index)
					: undefined;

		if (protectedEnd !== undefined) {
			result += replaceSegment(content.slice(segmentStart, index));
			result += content.slice(index, protectedEnd);
			segmentStart = protectedEnd;
			index = protectedEnd;
			continue;
		}

		index++;
	}

	return result + replaceSegment(content.slice(segmentStart));
}

export function decorateResourceNames(content: string, resources: readonly ChatResource[]): string {
	const registry = new Map(resources.map((entry) => [entry.name, entry]));
	if (registry.size === 0) return content;

	const entries = [...registry.values()]
		.filter((entry) => entry.name.length >= 3)
		.sort((a, b) => b.name.length - a.name.length);

	let result = content;
	for (const entry of entries) {
		result = replaceUnprotectedMarkdownText(result, (segment) => {
			const escaped = entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

			const startBoundary = /\w/.test(entry.name[0]) ? '\\b' : '(?<=^|[\\s,;:!?])';
			const endBoundary = /\w/.test(entry.name[entry.name.length - 1])
				? '\\b'
				: '(?=$|[\\s,;:!?.])';

			const pattern = new RegExp(
				'(?<!\\/)' + `${startBoundary}(${escaped})${endBoundary}` + '(?!://)',
				'g',
			);

			return segment.replace(pattern, (_match, name: string) => {
				const url = `n8n-resource://${entry.type}/${encodeURIComponent(entry.id)}`;
				return `[${escapeMarkdownLinkText(name)}](${url})`;
			});
		});
	}

	return result;
}
