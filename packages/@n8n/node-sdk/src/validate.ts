import { isRecord } from '@n8n/utils/is-record';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { safeRegex } from 'n8n-workflow';

import { isPageExpression, type AnySchema, type Infer, type JsonSchema } from './schema';

/** The value, or no value. Narrows an API field that must be a list. */
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const SHOWN_LENGTH = 80;

/** Issues go to logs and to the AI builder, so a value never shows a secret or a whole body. */
function shown(value: unknown, at: string): string {
	if (isSensitiveKey(at.split('.').pop() ?? '')) return '[REDACTED]';
	const text = scrubSecretsInText(JSON.stringify(value) ?? String(value));
	return text.length > SHOWN_LENGTH ? `${text.slice(0, SHOWN_LENGTH - 1)}…` : text;
}

const isExpression = (value: unknown) => typeof value === 'string' && value.startsWith('=');

function typeMatches(value: unknown, type: JsonSchema['type']): boolean {
	switch (type) {
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number';
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'array':
			return Array.isArray(value);
		case 'object':
			return isRecord(value);
		case 'null':
			return value === null;
		default:
			return true;
	}
}

const describe = (schema: JsonSchema) =>
	schema.enum
		? `one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`
		: (schema.type ?? 'a value');

const tagOf = (branch: JsonSchema, propertyName: string) =>
	branch.properties?.[propertyName]?.const;

/** The branch of the tag of `value`. Without a tag, the branch whose tag is optional: the default. */
const branchFor = (branches: readonly JsonSchema[], name: string, value: unknown) => {
	const tag = isRecord(value) ? value[name] : undefined;
	return branches.find((candidate) =>
		tag === undefined
			? !(candidate.required ?? []).includes(name) && tagOf(candidate, name) !== undefined
			: tagOf(candidate, name) === tag,
	);
};

/**
 * Validate a value against the JSON Schema subset contracts use. With `allowExpressions`,
 * any field except a discriminator or an `x-n8n-literal` field may hold a `={{ }}` string
 * (build time); at run time n8n has already resolved them.
 */
export function validate(
	value: unknown,
	schema: JsonSchema,
	options: { path?: string; allowExpressions?: boolean } = {},
): string[] {
	const issues: string[] = [];
	const visit = (current: unknown, node: JsonSchema, at: string): void => {
		if (current === undefined) return;
		if (options.allowExpressions && isExpression(current)) {
			if (node['x-n8n-literal']) issues.push(`${at}: must be a plain value, not an expression`);
			if (node['x-n8n-page'] && typeof current === 'string' && !isPageExpression(current)) {
				issues.push(`${at}: must read fields of $response, e.g. (page) => page.body.next_cursor`);
			}
			return;
		}
		if (node.oneOf && node.discriminator) {
			const name = node.discriminator.propertyName;
			const branch = branchFor(node.oneOf, name, current);
			if (!branch) {
				const tags = node.oneOf.map((candidate) => JSON.stringify(tagOf(candidate, name)));
				issues.push(`${at}: needs "${name}" set to one of ${tags.join(', ')}`);
				return;
			}
			return visit(current, branch, at);
		}
		const union = node.anyOf ?? node.oneOf;
		if (union) {
			if (!union.some((option) => validate(current, option, options).length === 0)) {
				issues.push(`${at}: does not match any allowed shape`);
			}
			return;
		}
		if (node.const !== undefined && current !== node.const) {
			issues.push(`${at}: must be ${JSON.stringify(node.const)}`);
			return;
		}
		if (node.enum && !node.enum.includes(current)) {
			issues.push(`${at}: must be ${describe(node)}, got ${shown(current, at)}`);
			return;
		}
		if (node.type && !typeMatches(current, node.type)) {
			issues.push(`${at}: must be ${describe(node)}, got ${shown(current, at)}`);
			return;
		}
		if (typeof current === 'string') {
			if (node.minLength && current.length < node.minLength)
				issues.push(`${at}: must not be empty`);
			if (node.pattern && !safeRegex.test(node.pattern, current)) {
				issues.push(`${at}: ${shown(current, at)} is not ${node['x-n8n-hint'] ?? node.pattern}`);
			}
		}
		if (typeof current === 'number') {
			if (node.minimum !== undefined && current < node.minimum) {
				issues.push(`${at}: must be at least ${node.minimum}`);
			}
			if (node.maximum !== undefined && current > node.maximum) {
				issues.push(`${at}: must be at most ${node.maximum}`);
			}
		}
		if (Array.isArray(current)) {
			if (node.minItems && current.length < node.minItems) {
				issues.push(`${at}: needs at least ${node.minItems} item(s)`);
			}
			const items = node.items;
			if (items) current.forEach((item, index) => visit(item, items, `${at}[${index}]`));
			return;
		}
		if (!isRecord(current)) return;
		for (const key of node.required ?? []) {
			if (current[key] === undefined) issues.push(`${at}.${key}: is required`);
		}
		const unknown = Object.entries(current).flatMap(([key, child]) => {
			const property =
				node.properties?.[key] ??
				Object.entries(node.patternProperties ?? {}).find(([pattern]) =>
					safeRegex.test(pattern, key),
				)?.[1];
			if (property) visit(child, property, `${at}.${key}`);
			else if (isRecord(node.additionalProperties)) {
				visit(child, node.additionalProperties, `${at}.${key}`);
			} else if (node.additionalProperties === false) return [key];
			return [];
		});
		if (unknown.length > 0) {
			const known = Object.keys(node.properties ?? {}).join(', ');
			issues.push(`${at}: unknown field(s) ${unknown.join(', ')}. Allowed: ${known}`);
		}
	};
	visit(value, schema, options.path ?? 'input');
	return issues;
}

/** Type guard: `value` matches `schema`. */
export const matches = <S extends AnySchema>(schema: S, value: unknown): value is Infer<S> =>
	validate(value, schema.json).length === 0;

/** `value` typed by `schema`. Throws with each failing path, e.g. `response.id: must be string`. */
export function parse<S extends AnySchema>(schema: S, value: unknown, path = 'response'): Infer<S> {
	if (matches(schema, value)) return value;
	throw new Error(validate(value, schema.json, { path }).join('; '));
}

const branchOf = (value: Record<string, unknown>, schema: JsonSchema) => {
	const name = schema.discriminator?.propertyName;
	return name === undefined ? undefined : branchFor(schema.oneOf ?? [], name, value);
};

/**
 * `value` with each missing `.default(v)` filled in, at any depth. n8n fills only top-level
 * defaults, and `runAction` must see the same input as n8n, so both paths call this.
 */
export function applyDefaults(value: unknown, schema: JsonSchema): unknown {
	const filled = value === undefined ? schema.default : value;
	if (Array.isArray(filled) && schema.items) {
		const { items } = schema;
		return filled.map((item) => applyDefaults(item, items));
	}
	if (!isRecord(filled)) return filled;
	const branch = branchOf(filled, schema);
	if (branch) return applyDefaults(filled, branch);
	return {
		...filled,
		...Object.fromEntries(
			Object.entries(schema.properties ?? {}).flatMap(([key, child]) => {
				const next = applyDefaults(filled[key], child);
				return next === undefined ? [] : [[key, next]];
			}),
		),
	};
}

const FORMAT_EXAMPLES: Record<string, string> = {
	date: '2026-09-15',
	'date-time': '2026-09-15T09:30:00.000Z',
	email: 'ada@example.com',
	uri: 'https://example.com/item/1',
	uuid: '8f14e45f-ceea-467a-9575-2a3b4c5d6e7f',
};

const CLASS_EXAMPLES: Record<string, string> = { d: '0', w: 'a', s: ' ', D: 'a', W: '-', S: 'a' };

type Parsed = { text: string; end: number } | undefined;

/** One character an escape matches: a class letter, or the escaped character itself. */
function escapeAt(pattern: string, at: number): Parsed {
	const char = pattern[at];
	if (char === undefined) return undefined;
	const shorthand = CLASS_EXAMPLES[char];
	if (shorthand !== undefined) return { text: shorthand, end: at + 1 };
	return /[A-Za-z0-9]/.test(char) ? undefined : { text: char, end: at + 1 };
}

/** The first character of a `[...]` class. A negated class is not supported. */
function classAt(pattern: string, at: number): Parsed {
	if (pattern[at] === '^') return undefined;
	const first =
		pattern[at] === '\\' ? escapeAt(pattern, at + 1) : { text: pattern[at] ?? '', end: at + 1 };
	const close = /(?:\\.|[^\\\]])*\]/y;
	close.lastIndex = at;
	return first?.text && close.exec(pattern)
		? { text: first.text, end: close.lastIndex }
		: undefined;
}

function atomAt(pattern: string, at: number): Parsed {
	const char = pattern[at];
	if (char === '\\') return escapeAt(pattern, at + 1);
	if (char === '[') return classAt(pattern, at + 1);
	if (char === '.') return { text: 'a', end: at + 1 };
	if (char === '(') {
		const start = pattern.startsWith('?:', at + 1) ? at + 3 : at + 1;
		if (pattern[start] === '?') return undefined;
		const group = alternativesAt(pattern, start);
		return group && pattern[group.end] === ')'
			? { text: group.text, end: group.end + 1 }
			: undefined;
	}
	return char === undefined || '^$|)*+?{}'.includes(char) ? undefined : { text: char, end: at + 1 };
}

/** The fewest repeats a quantifier allows, and where the quantifier ends. */
function quantifierAt(pattern: string, at: number): { times: number; end: number } {
	const match = /\{(\d+)(?:,\d*)?\}|[?*+]/y;
	match.lastIndex = at;
	const found = match.exec(pattern);
	if (!found) return { times: 1, end: at };
	const times = found[1] !== undefined ? Number(found[1]) : found[0] === '+' ? 1 : 0;
	// A lazy quantifier matches the same strings.
	return { times, end: pattern[match.lastIndex] === '?' ? match.lastIndex + 1 : match.lastIndex };
}

function sequenceAt(pattern: string, at: number, text = ''): Parsed {
	if (at >= pattern.length || pattern[at] === '|' || pattern[at] === ')') return { text, end: at };
	const atom = atomAt(pattern, at);
	if (!atom) return undefined;
	const { times, end } = quantifierAt(pattern, atom.end);
	return sequenceAt(pattern, end, text + atom.text.repeat(times));
}

/** The first alternative gives the text; the others are parsed only to find the end. */
function alternativesAt(pattern: string, at: number): Parsed {
	const first = sequenceAt(pattern, at);
	if (!first || pattern[first.end] !== '|') return first;
	const rest = alternativesAt(pattern, first.end + 1);
	return rest && { text: first.text, end: rest.end };
}

/**
 * The shortest string that a simple pattern matches: literals, escapes, classes, groups,
 * alternatives, and quantifiers. `undefined` for other constructs, e.g. a lookahead.
 */
function patternExample(pattern: string): string | undefined {
	const body = pattern.replace(/^\^/, '').replace(/(?<!\\)\$$/, '');
	const parsed = alternativesAt(body, 0);
	return parsed?.end === body.length ? parsed.text : undefined;
}

/** One plausible value for `schema`, for verification fixtures when a node declares none. */
export function exampleOf(schema: JsonSchema): unknown {
	// A capability from a sub-node is no data, so it has no example.
	if (schema['x-n8n-supply'] !== undefined) return undefined;
	if (schema.const !== undefined) return schema.const;
	if (schema['x-n8n-binary']) return 'data';
	if (schema.default !== undefined) return schema.default;
	if (schema.enum) return schema.enum[0];
	const union = schema.oneOf ?? schema.anyOf;
	if (union) {
		const first = union.find((option) => option.type !== 'null') ?? union[0];
		return first ? exampleOf(first) : null;
	}
	const examples = (schema as { examples?: readonly unknown[] }).examples;
	if (examples?.length) return examples[0];
	switch (schema.type) {
		case 'string':
			return (
				FORMAT_EXAMPLES[schema.format ?? ''] ??
				(schema.pattern ? patternExample(schema.pattern) : undefined) ??
				'example'
			);
		case 'number':
		case 'integer':
			return 1;
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'array':
			return schema.items ? [exampleOf(schema.items)] : [];
		default:
			return Object.fromEntries(
				Object.entries(schema.properties ?? {}).map(([key, child]) => [key, exampleOf(child)]),
			);
	}
}
