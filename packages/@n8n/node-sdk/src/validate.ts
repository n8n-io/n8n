import { isRecord } from '@n8n/utils/is-record';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { safeRegex } from 'n8n-workflow';

import {
	isPageExpression,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type Loose,
} from './schema';

/** The value, or no value. Narrows an API field that must be a list. */
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const SHOWN_LENGTH = 80;

/** Issues go to logs and to the AI builder, so a value never shows a secret or a whole body. */
function shown(value: unknown, at: string, node: JsonSchema): string {
	if (node.writeOnly || isSensitiveKey(at.split('.').pop() ?? '')) return '[REDACTED]';
	const text = scrubSecretsInText(JSON.stringify(value) ?? String(value));
	return text.length > SHOWN_LENGTH ? `${text.slice(0, SHOWN_LENGTH - 1)}…` : text;
}

const isExpression = (value: unknown) => typeof value === 'string' && value.startsWith('=');

/**
 * A binary field holds the key of a binary of the input item, e.g. `data`, as n8n stores it.
 * An expression gives the binary itself, not its key.
 */
export const binaryKeyIssue = (value: unknown, at: string): string | undefined =>
	typeof value === 'string' && value !== '' && !isExpression(value)
		? undefined
		: `${at}: must be the key of a binary of the input item, e.g. "data". Write (item) => item.binary.data`;

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

/** What a pattern needs for a match at one position, to the end of the scanned part. */
interface PatternScan {
	readonly end: number;
	/** Atoms with `*`, `+` or `{n,}`. */
	readonly unbounded: number;
	/** The ways the pattern can match, not counting the repeats of an unbounded atom. */
	readonly paths: number;
	/** The most characters one way matches, not counting the repeats of an unbounded atom. */
	readonly length: number;
}

const EMPTY_SCAN: PatternScan = { end: 0, unbounded: 0, paths: 1, length: 0 };

function repeatAt(pattern: string, at: number) {
	const match = /\{(\d+)(?:(,)(\d*))?\}|[*+?]/y;
	match.lastIndex = at;
	const found = match.exec(pattern);
	if (!found) return undefined;
	const [text, min, comma, max] = found;
	const [low, high] =
		text === '*'
			? [0, Infinity]
			: text === '+'
				? [1, Infinity]
				: text === '?'
					? [0, 1]
					: [Number(min), comma === undefined ? Number(min) : max ? Number(max) : Infinity];
	return {
		low,
		high,
		end: pattern[match.lastIndex] === '?' ? match.lastIndex + 1 : match.lastIndex,
	};
}

/** A character, an escape, a class or a group. A back reference, a lookbehind and a named group are not covered. */
function atomScanAt(pattern: string, at: number): PatternScan | undefined {
	const char = pattern[at];
	const one = (end: number): PatternScan => ({ end, unbounded: 0, paths: 1, length: 1 });
	if (char === '\\') return /[^1-9k]/.test(pattern[at + 1] ?? '1') ? one(at + 2) : undefined;
	if (char === '[') {
		const close = /(?:\\[\s\S]|[^\\\]])*\]/y;
		close.lastIndex = at + 1;
		return close.exec(pattern) ? one(close.lastIndex) : undefined;
	}
	if (char === '(') {
		const start = /^\(\?[:=!]/.test(pattern.slice(at, at + 3)) ? at + 3 : at + 1;
		if (pattern[start] === '?') return undefined;
		const group = alternativesScanAt(pattern, start);
		return group && pattern[group.end] === ')' ? { ...group, end: group.end + 1 } : undefined;
	}
	return char === undefined || '*+?{|)'.includes(char) ? undefined : one(at + 1);
}

/** A group may only be optional: a repeated group can backtrack in too many ways. */
function repeatedScanAt(pattern: string, at: number): PatternScan | undefined {
	const atom = atomScanAt(pattern, at);
	const repeat = atom && repeatAt(pattern, atom.end);
	if (!atom || !repeat) return atom;
	const { low, high, end } = repeat;
	if (pattern[at] === '(') {
		return high > 1 ? undefined : { ...atom, end, paths: atom.paths + (low === 0 ? 1 : 0) };
	}
	return high === Infinity
		? { end, unbounded: 1, paths: 1, length: low }
		: { end, unbounded: 0, paths: high - low + 1, length: high };
}

function sequenceScanAt(
	pattern: string,
	at: number,
	scanned = EMPTY_SCAN,
): PatternScan | undefined {
	if (at >= pattern.length || pattern[at] === '|' || pattern[at] === ')') {
		return { ...scanned, end: at };
	}
	const next = repeatedScanAt(pattern, at);
	return (
		next &&
		sequenceScanAt(pattern, next.end, {
			end: next.end,
			unbounded: scanned.unbounded + next.unbounded,
			paths: scanned.paths * next.paths,
			length: scanned.length + next.length,
		})
	);
}

function alternativesScanAt(pattern: string, at: number): PatternScan | undefined {
	const first = sequenceScanAt(pattern, at);
	if (!first || pattern[first.end] !== '|') return first;
	const rest = alternativesScanAt(pattern, first.end + 1);
	return (
		rest && {
			end: rest.end,
			unbounded: first.unbounded + rest.unbounded,
			paths: first.paths + rest.paths,
			length: Math.max(first.length, rest.length),
		}
	);
}

/** The scan recurses once for each atom. */
const MAX_SCANNED_PATTERN = 1000;

/**
 * The most backtracking steps for each input character, or `undefined` when a match can take
 * more than linear time, e.g. `(a+)+`, `a*a*`, or `a+b` without `^`. A backtracking engine tries
 * each way at each start position. With `^`, only the first position matches, so one unbounded
 * atom adds one factor of the input length.
 */
function stepsPerCharOf(pattern: string): number | undefined {
	if (pattern.length > MAX_SCANNED_PATTERN) return undefined;
	const scan = alternativesScanAt(pattern, 0);
	if (scan?.end !== pattern.length) return undefined;
	const anchored = pattern.startsWith('^') && sequenceScanAt(pattern, 0)?.end === pattern.length;
	return scan.unbounded > (anchored ? 1 : 0)
		? undefined
		: scan.paths * (scan.length + pattern.length);
}

/** The most steps of a native match. A match that can need more runs in `safeRegex`, which has a timeout. */
const MAX_NATIVE_STEPS = 1_000_000;
const MAX_NATIVE_PATTERNS = 1000;

const nativePatterns = new Map<string, { regex: RegExp; stepsPerChar: number } | false>();

function nativePatternOf(pattern: string) {
	const known = nativePatterns.get(pattern);
	if (known !== undefined) return known;
	const stepsPerChar = stepsPerCharOf(pattern);
	const compiled = (() => {
		if (stepsPerChar === undefined) return false;
		try {
			return { regex: new RegExp(pattern), stepsPerChar };
		} catch {
			// `safeRegex` throws the same error.
			return false;
		}
	})();
	if (nativePatterns.size < MAX_NATIVE_PATTERNS) nativePatterns.set(pattern, compiled);
	return compiled;
}

/**
 * `safeRegex.test` with the same result. `safeRegex` runs each match in a `vm` with a timeout,
 * about 100 µs a call. A pattern without flags whose match takes at most `MAX_NATIVE_STEPS`
 * steps for `input` runs natively instead, compiled once.
 */
export function testPattern(pattern: string, input: string, flags?: string): boolean {
	const native = flags ? false : nativePatternOf(pattern);
	return native && native.stepsPerChar * (input.length + 1) <= MAX_NATIVE_STEPS
		? native.regex.test(input)
		: safeRegex.test(pattern, input, flags);
}

/**
 * Validate a value against the JSON Schema subset contracts use. With `allowExpressions`,
 * any field except a discriminator, an `x-n8n-literal` field, or a binary field may hold a
 * `={{ }}` string (build time); at run time n8n has already resolved them.
 */
export function validate(
	value: unknown,
	schema: JsonSchema,
	options: {
		/**
		 * The path of `value` in the messages.
		 *
		 * @defaultValue `'input'`
		 */
		path?: string;
		/** Accept `={{ }}` expression strings, as at build time. */
		allowExpressions?: boolean;
	} = {},
): string[] {
	const issues: string[] = [];
	const visit = (current: unknown, node: JsonSchema, at: string): void => {
		if (current === undefined) return;
		if (options.allowExpressions && node['x-n8n-binary']) {
			const issue = binaryKeyIssue(current, at);
			if (issue) issues.push(issue);
			return;
		}
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
			issues.push(`${at}: must be ${describe(node)}, got ${shown(current, at, node)}`);
			return;
		}
		if (node.type && !typeMatches(current, node.type)) {
			issues.push(`${at}: must be ${describe(node)}, got ${shown(current, at, node)}`);
			return;
		}
		if (typeof current === 'string') {
			if (node.minLength && current.length < node.minLength)
				issues.push(`${at}: must not be empty`);
			if (node.pattern && !testPattern(node.pattern, current)) {
				issues.push(
					`${at}: ${shown(current, at, node)} is not ${node['x-n8n-hint'] ?? node.pattern}`,
				);
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
					testPattern(pattern, key),
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

/**
 * `value` as `schema` types it. An API may change its responses, so `parse` never throws: the
 * value passes through, and its type marks each field as possibly absent or `null`. The host
 * checks the output of the action and reports the drift. A value of another kind than an
 * object or array schema gives an empty one, so a field read never throws.
 */
export function parse<S extends AnySchema>(schema: S, value: unknown): Loose<Infer<S>>;
export function parse(schema: AnySchema, value: unknown): unknown {
	const { type } = schema.json;
	if (type === 'object' && !isRecord(value)) return {};
	if (type === 'array' && !Array.isArray(value)) return [];
	return value;
}

const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

/** `value` behind proxies that add the path of each field read to `paths`. */
function tracked(value: object, at: string, paths: Set<string>): object {
	const pathOf = (target: object, key: string) => {
		if (Array.isArray(target)) return /^\d+$/.test(key) ? `${at}[${key}]` : undefined;
		return Object.hasOwn(target, key) || !(key in Object.prototype) ? `${at}.${key}` : undefined;
	};
	return new Proxy(value, {
		get(target, key, receiver) {
			const child: unknown = Reflect.get(target, key, receiver);
			const path = typeof key === 'string' ? pathOf(target, key) : undefined;
			if (path === undefined) return child;
			paths.add(path);
			const fixed = Object.getOwnPropertyDescriptor(target, key);
			// A proxy must give the same value for a frozen field.
			if (!isObject(child) || (fixed?.configurable === false && !fixed.writable)) return child;
			return tracked(child, path, paths);
		},
		has(target, key) {
			const path = typeof key === 'string' ? pathOf(target, key) : undefined;
			if (path !== undefined) paths.add(path);
			return Reflect.has(target, key);
		},
	});
}

/** The paths that `read` reads in `value`, with their parents, or `undefined` when it throws. */
function readPathsOf(value: unknown, at: string, read: (value: unknown) => unknown) {
	const paths = new Set<string>();
	try {
		read(isObject(value) ? tracked(value, at, paths) : value);
	} catch {
		return undefined;
	}
	const parents = [...paths].flatMap((path) =>
		[...path.matchAll(/[.[]/g)].map((match) => path.slice(0, match.index)),
	);
	return new Set([at, ...paths, ...parents]);
}

/**
 * `value` typed by `schema`, for code that reads some fields of an API response. It throws with
 * each failing path, e.g. `page.results: must be array`, only when a field that `read` reads
 * does not match. The other issues come back as `drift`, so a change of a field that the code
 * does not read does not stop it. A value that becomes an output needs no `read`: the host
 * checks the output and warns about the drift. `parse` gives a type with each field optional.
 *
 * @example
 * ```ts
 * const { value: page, drift } = readAs(resultsPage, body, {
 *   path: 'page',
 *   read: (page) => [page.results, page.next_cursor],
 * });
 * ```
 */
export function readAs<S extends AnySchema>(
	schema: S,
	value: unknown,
	options?: {
		/**
		 * The path of `value` in the messages.
		 *
		 * @defaultValue `'value'`
		 */
		readonly path?: string;
		/** Reads the fields that must match. Only a value with issues runs it, through a proxy that records the reads. */
		readonly read?: (value: Infer<S>) => unknown;
	},
): {
	/** The value as it came, not a copy. */
	readonly value: Infer<S>;
	/** The issues of the fields that `read` does not read, e.g. `page.total: is required`. */
	readonly drift: readonly string[];
};
export function readAs(
	schema: AnySchema,
	value: unknown,
	options: { readonly path?: string; readonly read?: (value: unknown) => unknown } = {},
): { readonly value: unknown; readonly drift: readonly string[] } {
	const at = options.path ?? 'value';
	const issues = validate(value, schema.json, { path: at });
	if (issues.length === 0) return { value, drift: [] };
	const read = readPathsOf(value, at, options.read ?? (() => undefined));
	const failing = issues.filter(
		(issue) =>
			!read ||
			(!issue.includes(': unknown field(s) ') &&
				[...read].some((path) => issue.startsWith(`${path}: `))),
	);
	if (failing.length > 0) throw new Error(failing.join('; '));
	return { value, drift: issues };
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
