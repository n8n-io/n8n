import { isRecord } from '@n8n/utils/is-record';

import type { ContractInput, JsonSchema } from './types';

/** n8n treats a value as an expression only when its first character is `=`. */
export function isExpression(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

export const str = (hint?: string, extra: JsonSchema = {}): JsonSchema => ({
	type: 'string',
	...(hint ? { 'x-n8n-hint': hint } : {}),
	...extra,
});

export const num = (extra: JsonSchema = {}): JsonSchema => ({ type: 'number', ...extra });

export const bool = (extra: JsonSchema = {}): JsonSchema => ({ type: 'boolean', ...extra });

export const strList = (hint?: string): JsonSchema => ({
	type: 'array',
	items: { type: 'string' },
	...(hint ? { 'x-n8n-hint': hint } : {}),
});

export const obj = (
	properties: Record<string, JsonSchema>,
	required: readonly string[] = [],
	extra: JsonSchema = {},
): JsonSchema => ({ type: 'object', properties, required, ...extra });

/** Object whose keys the action cannot know in advance (API responses, sheet columns). */
export const openObj = (properties: Record<string, JsonSchema> = {}): JsonSchema => ({
	type: 'object',
	properties,
	additionalProperties: true,
});

interface VariantBranch {
	properties?: Record<string, JsonSchema>;
	required?: readonly string[];
	output?: JsonSchema;
	hint?: string;
}

/** Tagged union: lowers to `oneOf` + `discriminator`, one branch per tag. */
export function variant(
	propertyName: string,
	branches: Record<string, VariantBranch>,
	extra: JsonSchema = {},
): JsonSchema {
	return {
		type: 'object',
		discriminator: { propertyName },
		oneOf: Object.entries(branches).map(([tag, branch]) => ({
			type: 'object',
			properties: { [propertyName]: { const: tag }, ...branch.properties },
			required: [propertyName, ...(branch.required ?? [])],
			...(branch.hint ? { 'x-n8n-hint': branch.hint } : {}),
			...(branch.output ? { 'x-n8n-output': branch.output } : {}),
		})),
		...extra,
	};
}

/** The discriminator value a variant branch declares. */
export function branchTag(branch: JsonSchema, parent: JsonSchema): unknown {
	const propertyName = parent.discriminator?.propertyName ?? '';
	return branch.properties?.[propertyName]?.const;
}

export function record(value: unknown): ContractInput {
	return isRecord(value) ? value : {};
}

export function tagOf(value: unknown, propertyName: string): string | undefined {
	const tag = record(value)[propertyName];
	return typeof tag === 'string' ? tag : undefined;
}

/** Drops `undefined` values so compiled parameters stay minimal. */
export function compact(value: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

export function resourceLocator(mode: string, value: unknown, cachedResultName?: unknown) {
	return compact({
		__rl: true,
		mode,
		value: value ?? '',
		cachedResultName: typeof cachedResultName === 'string' ? cachedResultName : undefined,
	});
}

export function toKeyValueParameters(value: unknown) {
	return { parameters: Object.entries(record(value)).map(([name, v]) => ({ name, value: v })) };
}

function hasExpression(value: unknown): boolean {
	if (isExpression(value)) return true;
	if (Array.isArray(value)) return value.some(hasExpression);
	if (isRecord(value)) return Object.values(value).some(hasExpression);
	return false;
}

const INTERPOLATION = /\{\{([\s\S]*?)\}\}/g;

function expressionToJs(expression: string): string {
	const body = expression.slice(1);
	const whole = /^\s*\{\{([\s\S]*?)\}\}\s*$/.exec(body);
	if (whole && !whole[1].includes('{{')) return `(${whole[1].trim()})`;

	const escape = (literal: string) =>
		literal.replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\$' + '{');
	const matches = [...body.matchAll(INTERPOLATION)];
	const parts = matches.map((match, i) => {
		const start = i === 0 ? 0 : (matches[i - 1].index ?? 0) + matches[i - 1][0].length;
		return `${escape(body.slice(start, match.index))}\${${match[1].trim()}}`;
	});
	const tail = matches.at(-1);
	const rest = body.slice(tail ? (tail.index ?? 0) + tail[0].length : 0);
	return `\`${parts.join('')}${escape(rest)}\``;
}

function valueToJs(value: unknown): string {
	if (isExpression(value)) return expressionToJs(value);
	if (Array.isArray(value)) return `[${value.map(valueToJs).join(', ')}]`;
	if (isRecord(value)) {
		const entries = Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${valueToJs(v)}`);
		return `{ ${entries.join(', ')} }`;
	}
	return JSON.stringify(value) ?? 'null';
}

/**
 * Turns a JSON value whose leaves may be expressions into one parameter value. The node
 * receives a real object, so no step ever serializes text into a JSON string by hand.
 */
export function toObjectParameter(value: unknown): unknown {
	if (isExpression(value) || !hasExpression(value)) return value;
	return `={{ ${valueToJs(value)} }}`;
}

type SchemaType = NonNullable<JsonSchema['type']>;

/** JSON Schema primitive types as TS type text. */
export const primitiveType = (type: SchemaType | undefined) =>
	type === 'integer' ? 'number' : type === 'object' || type === 'array' ? undefined : type;

/** `^property_` becomes a template-literal key; any other pattern accepts every key. */
function patternKey(pattern: string): string {
	const prefix = /^\^([\w-]*)$/.exec(pattern)?.[1];
	return prefix === undefined ? 'string' : `\`${prefix}\${string}\``;
}

/** Value types that share a TS type render once: `title | rich_text: string`. */
function valueTypesComment(valueTypes: Record<string, JsonSchema>): string {
	const groups = new Map<string, string[]>();
	for (const [name, schema] of Object.entries(valueTypes)) {
		const hint = schema['x-n8n-hint'];
		const type = hint ? `${schemaToTs(schema)} (${hint})` : schemaToTs(schema);
		groups.set(type, [...(groups.get(type) ?? []), name]);
	}
	const rows = [...groups].map(([type, names]) => `${names.join(' | ')}: ${type}`);
	return `/* by type: ${rows.join('; ')} */ `;
}

/**
 * An output schema as TS type text. Declared output fields are always present. With `hints`,
 * `x-n8n-hint` and `x-n8n-value-types` render as comments, for the agent view.
 */
export function schemaToTs(schema: JsonSchema, options: { hints?: boolean } = {}): string {
	const hint = options.hints && schema['x-n8n-hint'] ? ` /* ${schema['x-n8n-hint']} */` : '';
	const valueTypes =
		options.hints && schema['x-n8n-value-types']
			? valueTypesComment(schema['x-n8n-value-types'])
			: '';
	const child = (value: JsonSchema) => schemaToTs(value, options);
	if (schema.const !== undefined) return JSON.stringify(schema.const) + hint;
	if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ') + hint;
	const union = schema.anyOf ?? schema.oneOf;
	if (union) {
		const wrap = (text: string) =>
			/^[{A]/.test(text) || !text.includes(' | ') ? text : `(${text})`;
		return union.map((option) => wrap(child(option))).join(' | ') + hint;
	}
	if (schema.type === 'array') return `Array<${schema.items ? child(schema.items) : 'any'}>${hint}`;
	if (schema.type !== 'object' && !schema.properties) {
		return valueTypes + (primitiveType(schema.type) ?? 'any') + hint;
	}
	const { additionalProperties } = schema;
	const closed =
		additionalProperties === false || (schema.properties && additionalProperties === undefined);
	const members = [
		...Object.entries(schema.properties ?? {}).map(
			([key, value]) => `${JSON.stringify(key)}: ${child(value)};`,
		),
		...Object.entries(schema.patternProperties ?? {}).map(
			([pattern, value]) => `[key: ${patternKey(pattern)}]: ${child(value)};`,
		),
		...(closed
			? []
			: [
					`[key: string]: ${isRecord(additionalProperties) ? child(additionalProperties) : 'any'};`,
				]),
	];
	return `{ ${members.join(' ')} }${hint}`;
}
