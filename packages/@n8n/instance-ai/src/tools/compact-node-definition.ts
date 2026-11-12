/**
 * Compacts the generated TypeScript node definitions that `get_node_types`
 * returns. The generated files are written for type checking, not for a model
 * to read: every field repeats `| Expression<T>`, most doc comments repeat the
 * field name, and HTML boilerplate and deep indentation add more. These rules
 * are structural, so they apply to every node in the same way. They keep
 * every field name, type, literal value and tag that changes what the model
 * writes (`@default`, `@show`, `@loadOptionsMethod`, `@builderHint`, ...).
 */

export const EXPRESSION_NOTE =
	"// Any field below also accepts an n8n expression (expr('...')); `| Expression<T>` is left out.";

const ENTITIES: Record<string, string> = {
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&apos;': "'",
	'&nbsp;': ' ',
	'&amp;': '&',
};

const HTML_TAG = /<\/?(?:a|b|br|code|em|i|li|p|strong|ul|ol)\b[^>]*>/gi;
const CHOOSE_FROM_LIST =
	/\s*Choose from the list, or specify (?:an ID|IDs|a name|names)(?: using an expression)?\.?/gi;

/** Remove every `| Expression<...>` member, balancing nested angle brackets. */
export function stripExpressionUnions(line: string): string {
	const marker = /\s*\|\s*Expression</g;
	let out = '';
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = marker.exec(line)) !== null) {
		let depth = 1;
		let i = match.index + match[0].length;
		while (i < line.length && depth > 0) {
			if (line[i] === '<') depth++;
			else if (line[i] === '>') depth--;
			i++;
		}
		if (depth !== 0) break;
		out += line.slice(last, match.index);
		last = i;
		marker.lastIndex = i;
	}
	return out + line.slice(last);
}

function cleanText(text: string): string {
	let result = text.replace(/&(?:lt|gt|quot|#39|apos|nbsp|amp);/g, (entity) => ENTITIES[entity]);
	result = result.replace(HTML_TAG, '');
	result = result.replace(CHOOSE_FROM_LIST, '');
	return result.replace(/\s+/g, ' ').trim();
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The property a doc comment describes, read from the line after it. */
function propertyName(line: string | undefined): string | undefined {
	return line?.match(/^\s*['"]?([A-Za-z_$][\w$]*)['"]?\??\s*:/)?.[1];
}

interface DocBlock {
	description: string;
	tags: string[];
}

function parseDocBlock(lines: string[]): DocBlock {
	const descriptionParts: string[] = [];
	const tags: string[] = [];
	for (const raw of lines) {
		const line = raw
			.replace(/^\s*\/\*\*/, '')
			.replace(/\*\/\s*$/, '')
			.replace(/^\s*\*\s?/, '')
			.trim();
		if (!line) continue;
		if (line.startsWith('@')) {
			tags.push(line);
		} else if (tags.length > 0) {
			// A continuation line belongs to the tag before it.
			tags[tags.length - 1] += ` ${line}`;
		} else {
			descriptionParts.push(line);
		}
	}
	return { description: descriptionParts.join(' '), tags };
}

function renderDocBlock(block: DocBlock, nextLine: string | undefined): string | undefined {
	let description = cleanText(block.description);
	const name = propertyName(nextLine);
	// A description that only repeats the field name tells the model nothing.
	if (name && normalize(description) === normalize(name)) description = '';
	const tags = block.tags.map((tag) =>
		cleanText(
			tag.replace(/^@displayOptions\.show\b/, '@show').replace(/^@displayOptions\.hide\b/, '@hide'),
		),
	);
	const parts = [description, ...tags].filter((part) => part.length > 0);
	if (parts.length === 0) return undefined;
	return `/** ${parts.join(' ').replace(/\*\//g, '*\\/')} */`;
}

function indentOf(line: string | undefined): number {
	return line?.match(/^ */)?.[0].length ?? 0;
}

/** Compact one generated definition file. Returns the input unchanged when it is empty. */
export function compactNodeDefinition(content: string): string {
	if (!content.trim()) return content;

	const lines = content.split('\n');
	const out: string[] = [];
	let sawExpression = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line.trim()) continue;

		const trimmed = line.trim();
		if (trimmed.startsWith('/**')) {
			const block: string[] = [];
			let j = i;
			while (j < lines.length) {
				block.push(lines[j]);
				if (lines[j].includes('*/')) break;
				j++;
			}
			// Find the code line the comment documents.
			let k = j + 1;
			while (k < lines.length && !lines[k].trim()) k++;
			const next = lines[k];
			const rendered = renderDocBlock(parseDocBlock(block), next);
			if (rendered) {
				// Indent the comment like the line it documents; the generator's comment indentation is inconsistent.
				out.push(' '.repeat(Math.floor(indentOf(next) / 2)) + rendered);
			}
			i = j;
			continue;
		}

		const stripped = stripExpressionUnions(line);
		if (stripped !== line) sawExpression = true;
		const indent = indentOf(stripped);
		out.push(' '.repeat(Math.floor(indent / 2)) + stripped.slice(indent).trimEnd());
	}

	if (sawExpression) out.unshift(EXPRESSION_NOTE);
	return out.join('\n');
}
