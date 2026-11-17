/**
 * The arguments of a tool node: the `$fromAI` calls in its parameters.
 *
 * v1 does not evaluate the calls to make the schema of a tool. It reads the text of every
 * string in the parameters (`extractFromAICalls` of `n8n-workflow`), also of a string that is
 * no expression. This file reads the text in the same way, so the schema is the schema of v1:
 * the keys in the order of the text, the type, the description and the default of each key,
 * as zod and `zod-to-json-schema` write them.
 *
 * The value of a call at run time is another matter: the expression translator gives it
 * (`src/convert/expression.ts`).
 */
import { isRecord } from './types.ts';

/** One `$fromAI` call, as v1 reads it from the text. */
export interface FromAiArgument {
	key: string;
	description?: string;
	/** `string`, `number`, `boolean` or `json`. */
	type: string;
	/** The default of the zod schema. Undefined: the model must give the argument. */
	defaultValue?: unknown;
}

/** The arguments of a tool, and the JSON schema that the model gets. */
export interface ToolArguments {
	arguments: FromAiArgument[];
	schema: Record<string, unknown>;
}

const TYPES = ['string', 'number', 'boolean', 'json'];
const QUOTES = ['"', "'", '`'];

/** `parseDefaultValue` of v1: the text of the fourth argument as a value of the type. */
function defaultOf(value: string | undefined, type: string): unknown {
	if (value === undefined) return undefined;
	if (type === 'string') return value;
	const lower = value.toLowerCase();
	if (type === 'boolean' && (lower === 'true' || lower === 'false')) return lower === 'true';
	if (type === 'number' && !Number.isNaN(Number(value))) return Number(value);
	try {
		const parsed: unknown = JSON.parse(value);
		return parsed;
	} catch {
		return value;
	}
}

/** `parseArguments` of v1: the text between the brackets of one call. */
function argumentOf(text: string): FromAiArgument | string {
	const parts: string[] = [];
	let current = '';
	let quote = '';
	let escaped = false;
	for (const char of text) {
		if (escaped) {
			current += char;
			escaped = false;
		} else if (char === '\\') {
			escaped = true;
		} else if (QUOTES.includes(char)) {
			if (quote === '') quote = char;
			else if (char === quote) quote = '';
			current += char;
		} else if (char === ',' && quote === '') {
			parts.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	if (current) parts.push(current.trim());
	const clean = parts.map((part) => {
		const quoted = QUOTES.some((q) => part.startsWith(q) && part.endsWith(q));
		if (!quoted) return part;
		return part
			.slice(1, -1)
			.replace(/\\'/g, "'")
			.replace(/\\`/g, '`')
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, '\\');
	});
	const type = (clean[2] ?? 'string').toLowerCase();
	if (!TYPES.includes(type)) return `$fromAI type ${clean[2]}`;
	return {
		key: clean[0] || '',
		description: clean[1],
		type,
		defaultValue: defaultOf(clean[3], type),
	};
}

/** `extractFromAICalls` of v1: every call in one string. A string gives the reason of a failure. */
function callsOf(text: string, out: FromAiArgument[]): string | undefined {
	const pattern = /\$fromAI\s*\(\s*/gi;
	for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
		let at = match.index + match[0].length;
		let quote = '';
		let depth = 1;
		let inner = '';
		while (at < text.length && depth > 0) {
			const char = text[at];
			if (quote !== '') {
				if (char === '\\' && at + 1 < text.length) {
					inner += char + text[at + 1];
					at += 2;
					continue;
				}
				if (char === quote) quote = '';
				inner += char;
			} else {
				if (QUOTES.includes(char)) quote = char;
				else if (char === '(') depth++;
				else if (char === ')') depth--;
				if (depth > 0 || char !== ')') inner += char;
			}
			at++;
		}
		if (depth !== 0) return '$fromAI call without an end';
		const parsed = argumentOf(inner);
		if (typeof parsed === 'string') return parsed;
		out.push(parsed);
	}
	return undefined;
}

/** `traverseNodeParameters` of v1: the calls of every string, in the order of the values. */
function traverse(value: unknown, out: FromAiArgument[]): string | undefined {
	if (typeof value === 'string') return callsOf(value, out);
	if (Array.isArray(value)) {
		for (const member of value) {
			const failed = traverse(member, out);
			if (failed !== undefined) return failed;
		}
		return undefined;
	}
	if (!isRecord(value)) return undefined;
	for (const member of Object.values(value)) {
		const failed = traverse(member, out);
		if (failed !== undefined) return failed;
	}
	return undefined;
}

/** The property of one argument, as `zod-to-json-schema` writes the zod type of v1. */
function propertyOf(argument: FromAiArgument): Record<string, unknown> {
	const property: Record<string, unknown> = {};
	if (argument.type !== 'json') property.type = argument.type;
	if (argument.description) {
		const description = argument.description.trim();
		if (description !== '') property.description = description;
	}
	if (argument.defaultValue !== undefined) property.default = argument.defaultValue;
	return property;
}

/** A key that the run-time `$fromAI` of v1 refuses, though the schema of v1 takes it. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * The arguments of a tool node (`getSchema` of v1), or the reason why v1 refuses the node or
 * this file has no proof for it. `parameters` are the parameters as the `Workflow` constructor
 * of n8n holds them: the order of the keys in the schema is the order of their values.
 */
export function toolArguments(parameters: Record<string, unknown>): ToolArguments | string {
	const found: FromAiArgument[] = [];
	const failed = traverse(parameters, found);
	if (failed !== undefined) return failed;
	const byKey = new Map<string, FromAiArgument>();
	for (const argument of found) {
		if (!/^[a-zA-Z0-9_-]{1,64}$/.test(argument.key)) return '$fromAI key';
		if (UNSAFE_KEYS.has(argument.key)) return '$fromAI key';
		const first = byKey.get(argument.key);
		if (first === undefined) {
			byKey.set(argument.key, argument);
		} else if (first.description !== argument.description || first.type !== argument.type) {
			return '$fromAI key with two descriptions or types';
		}
	}
	// The last call of a key gives its default; the first one gives its place.
	const last = new Map<string, FromAiArgument>();
	for (const argument of found) last.set(argument.key, argument);
	const list = [...last.values()];
	for (const argument of list) {
		// zod takes any value as the default of a type. A default of another type has no proof.
		const value = argument.defaultValue;
		if (value === undefined) continue;
		const fits =
			argument.type === 'json'
				? false
				: typeof value === argument.type && (typeof value !== 'number' || Number.isFinite(value));
		if (!fits) return '$fromAI default of another type';
	}
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const argument of list) {
		properties[argument.key] = propertyOf(argument);
		if (argument.defaultValue === undefined) required.push(argument.key);
	}
	const schema: Record<string, unknown> = { type: 'object', properties };
	if (required.length > 0) schema.required = required;
	schema.additionalProperties = false;
	schema.$schema = 'http://json-schema.org/draft-07/schema#';
	return { arguments: list, schema };
}

/** `nodeNameToToolName` of v1, for a name that needs no cut. Longer names have no proof. */
export function toolNameOf(node: string): string | undefined {
	const name = node.replace(/[^a-zA-Z0-9_-]+/g, '_');
	return name === '' || name.length > 64 ? undefined : name;
}
