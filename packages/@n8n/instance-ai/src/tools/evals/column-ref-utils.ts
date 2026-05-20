import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isRecord } from '../../utils/stream-helpers';

export { isRecord };

export type WorkflowNode = WorkflowJSON['nodes'][number];

export function unique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.length > 0))];
}

export function nodeTypeEndsWith(node: WorkflowNode, suffix: string): boolean {
	return node.type === suffix || node.type.endsWith(`.${suffix}`);
}

export function nodeHasName(node: WorkflowNode): node is WorkflowNode & { name: string } {
	return typeof node.name === 'string' && node.name.length > 0;
}

export function collectStrings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(collectStrings);
	if (!isRecord(value)) return [];
	return Object.values(value).flatMap(collectStrings);
}

const JS_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const JS_IDENTIFIER_START = /^[A-Za-z_$]$/;
const JS_IDENTIFIER_PART = /^[A-Za-z0-9_$]$/;

function charAt(text: string, index: number): string {
	return text[index] ?? '';
}

function isIdentifierPart(char: string): boolean {
	return JS_IDENTIFIER_PART.test(char);
}

function skipWhitespace(text: string, start: number): number {
	let index = start;
	while (/\s/.test(charAt(text, index))) index++;
	return index;
}

function readIdentifier(
	text: string,
	start: number,
): { value: string; endIndex: number } | undefined {
	const first = charAt(text, start);
	if (!JS_IDENTIFIER_START.test(first)) return undefined;
	let endIndex = start + 1;
	while (JS_IDENTIFIER_PART.test(charAt(text, endIndex))) endIndex++;
	return { value: text.slice(start, endIndex), endIndex };
}

function readQuotedString(
	text: string,
	start: number,
): { value: string; endIndex: number } | undefined {
	const quote = charAt(text, start);
	if (quote !== "'" && quote !== '"') return undefined;

	let value = '';
	for (let index = start + 1; index < text.length; index++) {
		const char = charAt(text, index);
		if (char === '\\') {
			const next = charAt(text, index + 1);
			if (next.length === 0) return undefined;
			value += next;
			index++;
			continue;
		}
		if (char === quote) {
			return { value, endIndex: index + 1 };
		}
		value += char;
	}

	return undefined;
}

type FieldPathAccessor = { field: string; path: string[]; endIndex: number };

function readFieldAccessor(text: string, start: number): FieldPathAccessor | undefined {
	if (charAt(text, start) === '.') {
		const identifier = readIdentifier(text, start + 1);
		if (!identifier) return undefined;
		return { field: identifier.value, path: [identifier.value], endIndex: identifier.endIndex };
	}

	if (charAt(text, start) !== '[') return undefined;
	const quoteStart = skipWhitespace(text, start + 1);
	const quoted = readQuotedString(text, quoteStart);
	if (!quoted) return undefined;
	const closeBracketIndex = skipWhitespace(text, quoted.endIndex);
	if (charAt(text, closeBracketIndex) !== ']') return undefined;
	return { field: quoted.value, path: [quoted.value], endIndex: closeBracketIndex + 1 };
}

function readFieldPathAccessor(text: string, start: number): FieldPathAccessor | undefined {
	const first = readFieldAccessor(text, start);
	const isMethodCall = (endIndex: number) => charAt(text, skipWhitespace(text, endIndex)) === '(';
	if (!first) return undefined;
	if (isMethodCall(first.endIndex)) return undefined;

	const fields = [first.field];
	const path = [...first.path];
	let endIndex = first.endIndex;
	while (true) {
		const next = readFieldAccessor(text, endIndex);
		if (!next) break;
		if (isMethodCall(next.endIndex)) break;
		fields.push(next.field);
		path.push(...next.path);
		endIndex = next.endIndex;
	}

	return { field: fields.join('.'), path, endIndex };
}

const ITEM_JSON_ACCESSOR_PATTERNS = [
	'.item.json',
	'.first().json',
	'.last().json',
	'.all().json',
] as const;

function readItemJsonField(text: string, start: number): FieldPathAccessor | undefined {
	for (const accessor of ITEM_JSON_ACCESSOR_PATTERNS) {
		if (!text.startsWith(accessor, start)) continue;
		return readFieldPathAccessor(text, start + accessor.length);
	}

	const itemMatching = /^\.itemMatching\(\d+\)\.json/.exec(text.slice(start));
	if (itemMatching) {
		return readFieldPathAccessor(text, start + itemMatching[0].length);
	}

	const allItem = /^\.all\(\)\[\d+\]\.json/.exec(text.slice(start));
	if (allItem) {
		return readFieldPathAccessor(text, start + allItem[0].length);
	}

	return undefined;
}

function readDirectJsonField(text: string, start: number): FieldPathAccessor | undefined {
	if (!text.startsWith('.json', start)) return undefined;
	return readFieldPathAccessor(text, start + '.json'.length);
}

function readItemsJsonField(text: string, start: number): FieldPathAccessor | undefined {
	const itemIndex = /^\[\d+\]/.exec(text.slice(start));
	const jsonStart = start + (itemIndex?.[0].length ?? 0);
	return readDirectJsonField(text, jsonStart);
}

function readNamedNodeJsonField(text: string, start: number): FieldPathAccessor | undefined {
	return readItemJsonField(text, start) ?? readDirectJsonField(text, start);
}

export function jsonFieldAccessor(field: string): string {
	return JS_IDENTIFIER.test(field) ? `.${field}` : `[${JSON.stringify(field)}]`;
}

export function jsonPathAccessor(path: readonly string[]): string {
	return path.map(jsonFieldAccessor).join('');
}

export function currentJsonExpression(field: string): string {
	return `$json${jsonFieldAccessor(field)}`;
}

export function currentJsonPathExpression(path: readonly string[]): string {
	return `$json${jsonPathAccessor(path)}`;
}

export function nodeItemJsonExpression(nodeName: string, path: readonly string[]): string {
	return `$(${JSON.stringify(nodeName)}).item.json${jsonPathAccessor(path)}`;
}

export interface DirectJsonRefMatch {
	field: string;
	path: string[];
	originalExpression: string;
}

function readJsonRefAt(text: string, index: number): FieldPathAccessor | undefined {
	if (text.startsWith('$json', index) && !isIdentifierPart(charAt(text, index + 5))) {
		return readFieldPathAccessor(text, index + 5);
	}

	if (text.startsWith('$input', index) && !isIdentifierPart(charAt(text, index + 6))) {
		return readItemJsonField(text, index + 6) ?? readItemsJsonField(text, index + 6);
	}

	return undefined;
}

function readBareItemJsonRefAt(text: string, index: number): FieldPathAccessor | undefined {
	if (!text.startsWith('item.json', index)) return undefined;
	const previous = charAt(text, index - 1);
	if (previous && (isIdentifierPart(previous) || previous === '.')) return undefined;
	return readFieldPathAccessor(text, index + 'item.json'.length);
}

export function extractJsonRefMatches(text: string): DirectJsonRefMatch[] {
	const matches: DirectJsonRefMatch[] = [];

	for (let index = 0; index < text.length; index++) {
		const match = readJsonRefAt(text, index);
		if (!match) continue;
		matches.push({
			field: match.field,
			path: match.path,
			originalExpression: text.slice(index, match.endIndex),
		});
		index = match.endIndex - 1;
	}

	return matches;
}

export function extractJsonColumnRefs(text: string): string[] {
	return unique(extractJsonRefMatches(text).map((match) => match.field));
}

export function extractDirectJsonRefMatches(text: string): DirectJsonRefMatch[] {
	const matches = extractJsonRefMatches(text);

	for (let index = 0; index < text.length; index++) {
		const match = readBareItemJsonRefAt(text, index);
		if (!match) continue;
		matches.push({
			field: match.field,
			path: match.path,
			originalExpression: text.slice(index, match.endIndex),
		});
		index = match.endIndex - 1;
	}

	const dedup = new Map<string, DirectJsonRefMatch>();
	for (const match of matches) dedup.set(match.originalExpression, match);
	return [...dedup.values()];
}

export function extractDirectJsonColumnRefs(text: string): string[] {
	return unique(extractDirectJsonRefMatches(text).map((match) => match.field));
}

/**
 * Match named cross-node references in expressions.
 * Captures (sourceNodeName, field) pairs for:
 *   - $('Name').item.json.field
 *   - $("Name").item.json.field
 *   - $("Name").first().json["field-name"]
 *   - $items("Name")[0].json.field
 *   - $node["Name"].json.field and $node.Name.item.json.field (legacy)
 */
export interface NamedRefMatch {
	nodeName: string;
	field: string;
	path: string[];
	originalExpression: string;
}

function readDollarNodeRef(text: string, start: number): NamedRefMatch | undefined {
	const quoteStart = skipWhitespace(text, start + '$('.length);
	const nodeName = readQuotedString(text, quoteStart);
	if (!nodeName) return undefined;
	const closeParenIndex = skipWhitespace(text, nodeName.endIndex);
	if (charAt(text, closeParenIndex) !== ')') return undefined;
	const field = readItemJsonField(text, closeParenIndex + 1);
	if (!field) return undefined;
	return {
		nodeName: nodeName.value,
		field: field.field,
		path: field.path,
		originalExpression: text.slice(start, field.endIndex),
	};
}

function readItemsNodeRef(text: string, start: number): NamedRefMatch | undefined {
	const quoteStart = skipWhitespace(text, start + '$items('.length);
	const nodeName = readQuotedString(text, quoteStart);
	if (!nodeName) return undefined;

	const closeParenIndex = text.indexOf(')', nodeName.endIndex);
	if (closeParenIndex < 0) return undefined;
	const field = readItemsJsonField(text, closeParenIndex + 1);
	if (!field) return undefined;
	return {
		nodeName: nodeName.value,
		field: field.field,
		path: field.path,
		originalExpression: text.slice(start, field.endIndex),
	};
}

function readNodeBracketRef(text: string, start: number): NamedRefMatch | undefined {
	const quoteStart = skipWhitespace(text, start + '$node['.length);
	const nodeName = readQuotedString(text, quoteStart);
	if (!nodeName) return undefined;
	const closeBracketIndex = skipWhitespace(text, nodeName.endIndex);
	if (charAt(text, closeBracketIndex) !== ']') return undefined;
	const field = readNamedNodeJsonField(text, closeBracketIndex + 1);
	if (!field) return undefined;
	return {
		nodeName: nodeName.value,
		field: field.field,
		path: field.path,
		originalExpression: text.slice(start, field.endIndex),
	};
}

function readNodeDotRef(text: string, start: number): NamedRefMatch | undefined {
	const nodeName = readIdentifier(text, start + '$node.'.length);
	if (!nodeName) return undefined;
	const field = readNamedNodeJsonField(text, nodeName.endIndex);
	if (!field) return undefined;
	return {
		nodeName: nodeName.value,
		field: field.field,
		path: field.path,
		originalExpression: text.slice(start, field.endIndex),
	};
}

function readNamedRefAt(text: string, start: number): NamedRefMatch | undefined {
	if (text.startsWith('$items(', start)) return readItemsNodeRef(text, start);
	if (text.startsWith('$(', start)) return readDollarNodeRef(text, start);
	if (text.startsWith('$node[', start)) return readNodeBracketRef(text, start);
	if (text.startsWith('$node.', start)) return readNodeDotRef(text, start);
	return undefined;
}

export function extractNamedRefMatches(text: string): NamedRefMatch[] {
	const matches: NamedRefMatch[] = [];
	for (let index = 0; index < text.length; index++) {
		const match = readNamedRefAt(text, index);
		if (match) {
			matches.push(match);
			index += match.originalExpression.length - 1;
		}
	}
	return matches;
}

/**
 * Returns names of nodes connected into `agentNodeName` via any `ai_*`
 * connection type — i.e. tools, memory, output parsers, etc.
 */
export function findAgentSubComponents(workflow: WorkflowJSON, agentNodeName: string): string[] {
	const subs = new Set<string>();
	for (const [sourceName, byType] of Object.entries(workflow.connections ?? {})) {
		if (!isRecord(byType)) continue;
		for (const [connType, slot] of Object.entries(byType)) {
			if (!connType.startsWith('ai_')) continue;
			if (!Array.isArray(slot)) continue;
			for (const inner of slot) {
				if (!Array.isArray(inner)) continue;
				for (const conn of inner) {
					if (isRecord(conn) && conn.node === agentNodeName) {
						subs.add(sourceName);
						break;
					}
				}
			}
		}
	}
	return [...subs];
}
