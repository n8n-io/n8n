import { isRecord } from '@n8n/utils/is-record';

import { testPattern } from './pattern';
import {
	FORMAT_EXAMPLES,
	variantBranchOf,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type Loose,
} from './schema';
import { validate } from './validator';

/** The value, or no value. Narrows an API field that must be a list. */
export const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/**
 * The keys of an output item that hold binaries: each top-level `t.binary()` field, and each key
 * that a `t.indexedBinaries()` pattern matches, of the object or of a `t.union()` branch.
 */
export function outputBinaryKeys(output: JsonSchema): (key: string) => boolean {
	const objects = [output, ...(output.anyOf ?? [])];
	const binaryEntries = (map: Record<string, JsonSchema> | undefined) =>
		Object.entries(map ?? {}).flatMap(([key, field]) => (field['x-n8n-binary'] ? [key] : []));
	const fixed = new Set(objects.flatMap(({ properties }) => binaryEntries(properties)));
	const patterns = objects.flatMap(({ patternProperties }) => binaryEntries(patternProperties));
	return (key) => fixed.has(key) || patterns.some((pattern) => testPattern(pattern, key));
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
	return readOf(value, validate(value, schema.json, { path: at }), at, options.read);
}

/** `value` with its `issues` as drift, or the error of the issues at the paths that `read` reads. */
function readOf(
	value: unknown,
	issues: readonly string[],
	at: string,
	readFields: ((value: unknown) => unknown) | undefined,
): { readonly value: unknown; readonly drift: readonly string[] } {
	if (issues.length === 0) return { value, drift: [] };
	const read = readPathsOf(value, at, readFields ?? (() => undefined));
	const failing = issues.filter(
		(issue) =>
			!read ||
			(!issue.includes(': unknown field(s) ') &&
				[...read].some((path) => issue.startsWith(`${path}: `))),
	);
	if (failing.length > 0) throw new Error(failing.join('; '));
	return { value, drift: issues };
}

/** The keywords that hold what a local `$ref` points to. A ref resolves from the root. */
const DEFINITIONS = new Set(['$defs', 'definitions']);
const listSchemas = new WeakMap<JsonSchema, JsonSchema>();

/** A list of `item`, the same object for each call, so the validator compiles it once. */
function listSchemaOf(item: JsonSchema): JsonSchema {
	const known = listSchemas.get(item);
	if (known) return known;
	const entries = Object.entries(item);
	const list: JsonSchema = {
		type: 'array',
		items: Object.fromEntries(entries.filter(([key]) => !DEFINITIONS.has(key))),
		...Object.fromEntries(entries.filter(([key]) => DEFINITIONS.has(key))),
	};
	listSchemas.set(item, list);
	return list;
}

/**
 * `values.map((value) => readAs(schema, value, options))`, with one validator call for all
 * values. A sandbox guest makes one host call for each validator call, so read a page of items
 * with this, not with `readAs` for each item. It throws the error of the first value that
 * `readAs` would fail on. A local `$ref` in `schema` must point into `$defs` or `definitions`.
 *
 * @example
 * ```ts
 * const rows = readAllAs(row, body.values).map(({ value }) => value);
 * ```
 */
export function readAllAs<S extends AnySchema>(
	schema: S,
	values: readonly unknown[],
	options?: {
		/**
		 * The path of each value in the messages.
		 *
		 * @defaultValue `'value'`
		 */
		readonly path?: string;
		/** Reads the fields of one value that must match. Only a value with issues runs it. */
		readonly read?: (value: Infer<S>) => unknown;
	},
): ReadonlyArray<{
	/** The value as it came, not a copy. */
	readonly value: Infer<S>;
	/** The issues of the fields that `read` does not read, e.g. `value.total: is required`. */
	readonly drift: readonly string[];
}>;
export function readAllAs(
	schema: AnySchema,
	values: readonly unknown[],
	options: { readonly path?: string; readonly read?: (value: unknown) => unknown } = {},
): ReadonlyArray<{ readonly value: unknown; readonly drift: readonly string[] }> {
	if (values.length === 0) return [];
	const at = options.path ?? 'value';
	const prefix = `${at}[`;
	// The issues of item 3 start with `value[3]`; `readAs` of that item gives them at `value`.
	const issues = validate(values, listSchemaOf(schema.json), { path: at }).map((issue) => {
		const close = issue.startsWith(prefix) ? issue.indexOf(']', prefix.length) : -1;
		return close < 0
			? { text: issue }
			: {
					index: Number(issue.slice(prefix.length, close)),
					text: `${at}${issue.slice(close + 1)}`,
				};
	});
	const byIndex = new Map<number | undefined, string[]>();
	for (const { index, text } of issues) {
		const group = byIndex.get(index);
		if (group) group.push(text);
		else byIndex.set(index, [text]);
	}
	const shared = byIndex.get(undefined) ?? [];
	return values.map((value, index) =>
		readOf(
			value,
			// `readAs` gives no issue for `undefined`. A guest sends JSON, where it becomes `null`.
			value === undefined ? [] : [...shared, ...(byIndex.get(index) ?? [])],
			at,
			options.read,
		),
	);
}

const branchOf = (value: Record<string, unknown>, schema: JsonSchema) => {
	const name = schema.discriminator?.propertyName;
	return name === undefined ? undefined : variantBranchOf(schema.oneOf ?? [], name, value);
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
