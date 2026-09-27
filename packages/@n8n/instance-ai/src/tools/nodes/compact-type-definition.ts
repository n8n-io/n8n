/**
 * Shrinks a generated node type definition before it reaches the model.
 *
 * Definitions stay in the conversation for every later step of a build, so
 * each character is paid for many times. The transforms here only remove
 * redundancy: layout, markup, repeated text, and members the node type can
 * never show. Every parameter, type, default, display condition, and hint
 * that applies to the node stays in the output.
 */

const HTML_ENTITIES: ReadonlyArray<[string, string]> = [
	['&lt;', '<'],
	['&gt;', '>'],
	['&quot;', '"'],
	['&#39;', "'"],
	['&amp;', '&'],
];

const ANCHOR_TAG = /<a\s[^>]*>([\s\S]*?)<\/a>/g;
const FORMATTING_TAG = /<\/?(?:code|b|i|strong|em|p|ul|ol|li)\s*>|<br\s*\/?>/g;

const JSDOC_BLOCK = /([ \t]*)\/\*\*([\s\S]*?)\*\/[ \t]*(\n?)/g;

/** A top-level member that the node only shows while it runs as an AI tool. */
const TOOL_ONLY_MEMBER =
	/[ \t]*\/\*\*(?:(?!\*\/)[\s\S])*?@displayOptions\.show \{[^}\n]*@tool: \[true\][^}\n]*\}(?:(?!\*\/)[\s\S])*?\*\/[ \t]*\n[ \t]*[A-Za-z_$][\w$]*\??:[^\n]*;[ \t]*\n/g;

const QUOTED_LITERAL_UNION = /'[^'\n]*'(?:\s*\|\s*'[^'\n]*')+/g;

/** Only long hints are worth replacing; short ones are cheaper to repeat. */
const MIN_DEDUPED_HINT_LENGTH = 120;

function decodeCommentMarkup(text: string): string {
	let decoded = text;
	for (const [entity, character] of HTML_ENTITIES) {
		decoded = decoded.split(entity).join(character);
	}
	return decoded.replace(ANCHOR_TAG, '$1').replace(FORMATTING_TAG, '');
}

/**
 * Tool variants are generated as separate node types (`<name>Tool`), so on the
 * base node a member gated on `@tool: [true]` can never be set.
 */
function dropToolOnlyMembers(content: string, nodeType: string): string {
	if (nodeType.endsWith('Tool')) return content;
	return content.replace(TOOL_ONLY_MEMBER, '');
}

function dedupeUnionLiterals(content: string): string {
	return content.replace(QUOTED_LITERAL_UNION, (union) => {
		const members = union.split('|').map((member) => member.trim());
		return [...new Set(members)].join(' | ');
	});
}

function commentLines(body: string): string[] {
	return body
		.split('\n')
		.map((line) => decodeCommentMarkup(line.replace(/^\s*\*?\s?/, '')).trim())
		.filter((line) => line.length > 0);
}

function normalizeName(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** A title that only repeats the member name (`Value` above `value?:`) carries nothing. */
function isRedundantTitle(lines: string[], memberName: string | undefined): boolean {
	if (!memberName || lines.length !== 1) return false;
	const title = normalizeName(lines[0]);
	const name = normalizeName(memberName);
	return title === name || `${title}s` === name || title === `${name}s`;
}

/**
 * Rewrites JSDoc blocks as `//` lines, drops titles that repeat the member
 * name, and replaces a long `@builderHint` seen earlier with a back-reference.
 */
function rewriteComments(content: string): string {
	const seenHints = new Set<string>();

	return content.replace(
		JSDOC_BLOCK,
		(block: string, indent: string, body: string, newline: string, offset: number) => {
			const following = content.slice(offset + block.length);
			const memberName = /^[ \t]*([A-Za-z_$][\w$]*)\??:/.exec(following)?.[1];
			const lines = commentLines(body);
			if (lines.length === 0 || isRedundantTitle(lines, memberName)) return '';

			const rewritten: string[] = [];
			for (let index = 0; index < lines.length; index++) {
				const line = lines[index];
				if (!line.startsWith('@builderHint ')) {
					rewritten.push(line);
					continue;
				}

				// A hint runs until the next tag, so its continuation lines belong to it.
				let end = index + 1;
				while (end < lines.length && !lines[end].startsWith('@')) end++;
				const hint = lines.slice(index, end).join(' ');
				const key = hint.replace(/\s+/g, ' ');
				if (key.length >= MIN_DEDUPED_HINT_LENGTH && seenHints.has(key)) {
					rewritten.push('@builderHint Same as the identical @builderHint above.');
				} else {
					seenHints.add(key);
					rewritten.push(...lines.slice(index, end));
				}
				index = end - 1;
			}

			return rewritten.map((line) => `${indent}// ${line}`).join('\n') + (newline || '\n');
		},
	);
}

/** Indents one space per open brace so nesting stays visible at a fraction of the width. */
function reindentByDepth(content: string): string {
	let depth = 0;
	return content
		.split('\n')
		.map((rawLine) => {
			const line = rawLine.trim();
			if (line.length === 0) return '';
			if (line.startsWith('//')) return `${' '.repeat(depth)}${line}`;

			const leadingCloses = line.length - line.replace(/^[}\])>;,\s]*/, '').length;
			const closesAtStart = (line.slice(0, leadingCloses).match(/}/g) ?? []).length;
			const indented = `${' '.repeat(Math.max(depth - closesAtStart, 0))}${line}`;
			const opens = (line.match(/{/g) ?? []).length;
			const closes = (line.match(/}/g) ?? []).length;
			depth = Math.max(depth + opens - closes, 0);
			return indented;
		})
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

export function compactTypeDefinition(content: string, nodeType: string): string {
	if (content.length === 0) return content;
	const withoutToolOnly = dropToolOnlyMembers(content, nodeType);
	const deduped = dedupeUnionLiterals(withoutToolOnly);
	return reindentByDepth(rewriteComments(deduped));
}
