import { isRecord } from '@n8n/utils/is-record';
import { DateTime, Duration, Interval } from 'luxon';

// Each run reads the clock or a random source, so two engines legitimately disagree.
const NON_DETERMINISTIC_PATTERN =
	/\$now\b|\$today\b|\bDate\b|\bDateTime\s*\.\s*(?:now|local|utc)\b|\bMath\s*\.\s*random\b|\.randomItem\s*\(/;

/** Whether the value of an expression depends on when it runs, so values cannot be compared. */
export function isNonDeterministic(source: string): boolean {
	return NON_DETERMINISTIC_PATTERN.test(source);
}

export function valueType(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (DateTime.isDateTime(value)) return 'DateTime';
	if (Duration.isDuration(value)) return 'Duration';
	if (Interval.isInterval(value)) return 'Interval';
	if (value instanceof Date) return 'Date';
	if (value instanceof Map) return 'Map';
	if (value instanceof Set) return 'Set';
	if (value instanceof Error) return 'Error';
	return typeof value;
}

const MAX_CANONICAL_NODES = 10_000;

class ValueTooLargeError extends Error {}

interface CanonicalState {
	nodes: number;
	seen: Set<object>;
}

/**
 * A string that is equal for two values when both engines produced the same
 * result. Dates compare by instant and zone, objects by sorted keys. Returns
 * `undefined` when the value is too large to compare on the main thread.
 */
export function canonicalize(value: unknown): string | undefined {
	try {
		return writeCanonical(value, { nodes: 0, seen: new Set() });
	} catch (error) {
		if (error instanceof ValueTooLargeError) return undefined;
		throw error;
	}
}

function writeCanonical(value: unknown, state: CanonicalState): string {
	state.nodes += 1;
	if (state.nodes > MAX_CANONICAL_NODES) throw new ValueTooLargeError();

	switch (typeof value) {
		case 'string':
			return JSON.stringify(value);
		case 'number':
		case 'boolean':
			return String(value);
		case 'bigint':
			return `${value}n`;
		case 'undefined':
		case 'symbol':
		case 'function':
			return typeof value;
	}

	if (value === null) return 'null';
	if (typeof value !== 'object') return typeof value;
	if (DateTime.isDateTime(value)) {
		return value.isValid ? `DateTime(${value.toISO()}|${value.zoneName})` : 'DateTime(invalid)';
	}
	if (Duration.isDuration(value)) return `Duration(${value.toISO()})`;
	if (Interval.isInterval(value)) return `Interval(${value.toISO()})`;
	if (value instanceof Date) {
		return `Date(${Number.isNaN(value.getTime()) ? 'invalid' : value.toISOString()})`;
	}

	if (state.seen.has(value)) return 'circular';
	state.seen.add(value);
	try {
		if (Array.isArray(value)) {
			return `[${value.map((entry) => writeCanonical(entry, state)).join(',')}]`;
		}
		if (value instanceof Map) {
			const entries = [...value.entries()].map(
				([key, entry]) => `${writeCanonical(key, state)}=>${writeCanonical(entry, state)}`,
			);
			return `Map{${entries.join(',')}}`;
		}
		if (value instanceof Set) {
			return `Set[${[...value].map((entry) => writeCanonical(entry, state)).join(',')}]`;
		}
		if (value instanceof Error) return `Error(${value.name})`;
		if (!isRecord(value)) return 'object';

		const entries = Object.entries(value)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, entry]) => `${JSON.stringify(key)}:${writeCanonical(entry, state)}`);
		return `{${entries.join(',')}}`;
	} finally {
		state.seen.delete(value);
	}
}

const MAX_SKELETON_LENGTH = 300;

// Names that come from JavaScript or n8n, not from the user's data.
const KNOWN_NAMES = new Set([
	'Array',
	'BigInt',
	'Boolean',
	'Date',
	'DateTime',
	'Duration',
	'Error',
	'Infinity',
	'Interval',
	'Intl',
	'JSON',
	'Map',
	'Math',
	'NaN',
	'Number',
	'Object',
	'RegExp',
	'Set',
	'String',
	'Symbol',
	'break',
	'case',
	'catch',
	'const',
	'continue',
	'decodeURI',
	'decodeURIComponent',
	'default',
	'delete',
	'do',
	'else',
	'encodeURI',
	'encodeURIComponent',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'in',
	'instanceof',
	'isFinite',
	'isNaN',
	'let',
	'new',
	'null',
	'of',
	'parseFloat',
	'parseInt',
	'return',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'undefined',
	'var',
	'void',
	'while',
]);

// Members that n8n or JavaScript define, so reading them does not reveal user data.
const KNOWN_MEMBERS = new Set([
	'binary',
	'context',
	'isExecuted',
	'item',
	'json',
	'length',
	'pairedItem',
	'params',
	'runIndex',
]);

const IDENTIFIER = /^[A-Za-z_$][\w$]*/;
const NUMBER =
	/^(?:0[xXoObB][\da-fA-F_]+n?|\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?n?|\.\d+(?:[eE][+-]?\d+)?)/;

/**
 * The shape of an expression, without the parts that can hold user data:
 * field names become `<id>`, strings `<str>`, numbers `<num>`, and text outside
 * `{{ }}` becomes `<text>`. Method names, `$` variables and JavaScript names stay,
 * so a mismatch can be reproduced without seeing the original expression.
 */
export function expressionSkeleton(source: string): string {
	const tokens: string[] = [];
	let index = 0;
	let inCode = false;
	let depth = 0;
	let afterDot = false;
	let hasText = false;

	const flushText = () => {
		if (hasText) tokens.push('<text>');
		hasText = false;
	};

	while (index < source.length) {
		if (!inCode) {
			if (source.startsWith('{{', index)) {
				flushText();
				tokens.push('{{');
				inCode = true;
				depth = 0;
				afterDot = false;
				index += 2;
			} else {
				hasText = true;
				index += 1;
			}
			continue;
		}

		const rest = source.slice(index);
		const char = source[index];

		if (depth === 0 && rest.startsWith('}}')) {
			tokens.push('}}');
			inCode = false;
			index += 2;
			continue;
		}
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (char === '"' || char === "'" || char === '`') {
			index = skipString(source, index);
			tokens.push('<str>');
			afterDot = false;
			continue;
		}

		const number = NUMBER.exec(rest);
		if (number) {
			index += number[0].length;
			tokens.push('<num>');
			afterDot = false;
			continue;
		}

		const identifier = IDENTIFIER.exec(rest);
		if (identifier) {
			const name = identifier[0];
			index += name.length;
			if (afterDot) {
				// A called member is a method of JavaScript or n8n; a read member is a field name.
				const isCall = nextNonSpace(source, index) === '(';
				tokens.push(isCall || KNOWN_MEMBERS.has(name) ? name : '<id>');
			} else {
				tokens.push(name.startsWith('$') || KNOWN_NAMES.has(name) ? name : '<id>');
			}
			afterDot = false;
			continue;
		}

		if (rest.startsWith('?.') && !/\d/.test(rest[2] ?? '')) {
			tokens.push('?.');
			afterDot = true;
			index += 2;
			continue;
		}

		if (char === '{' || char === '(' || char === '[') depth += 1;
		if (char === '}' || char === ')' || char === ']') depth = Math.max(0, depth - 1);
		tokens.push(char);
		afterDot = char === '.';
		index += 1;
	}
	flushText();

	const skeleton = joinTokens(tokens);
	return skeleton.length > MAX_SKELETON_LENGTH
		? `${skeleton.slice(0, MAX_SKELETON_LENGTH)}…`
		: skeleton;
}

function skipString(source: string, start: number): number {
	const quote = source[start];
	let index = start + 1;
	while (index < source.length) {
		if (source[index] === '\\') {
			index += 2;
			continue;
		}
		if (source[index] === quote) return index + 1;
		index += 1;
	}
	return index;
}

function nextNonSpace(source: string, start: number): string | undefined {
	let index = start;
	while (index < source.length && /\s/.test(source[index])) index += 1;
	return source[index];
}

function joinTokens(tokens: string[]): string {
	let result = '';
	for (const token of tokens) {
		const needsSpace =
			token === '{{' ||
			token === '}}' ||
			result.endsWith('{{') ||
			result.endsWith('}}') ||
			(/[\w$>]$/.test(result) && /^[\w$<]/.test(token));
		result += result && needsSpace ? ` ${token}` : token;
	}
	return result;
}
