// The JSON Schema validator of the host. A packed bundle does not inline this module: pack
// keeps it external as `@n8n/node-sdk/validator`, the host process gives it to the bundle, and
// a sandbox guest calls it through the `schema` import. A bundle gets only `validate`.
import { isRecord } from '@n8n/utils/is-record';
import { hasPlaceholderDeep } from '@n8n/utils/placeholder';
import { isSensitiveKey } from '@n8n/utils/redaction/sensitive-key';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import type { AnySchemaObject, ErrorObject, KeywordDefinition, ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import type { RegExpEngine } from 'ajv/dist/types';
import { isFromAIOnlyExpression } from 'n8n-workflow';

import { stepsPerCharOf, testPattern } from './pattern';
import {
	binaryKeyIssue,
	FORMAT_EXAMPLES,
	isPageExpression,
	variantBranchOf,
	variantTagOf,
	type JsonSchema,
} from './schema';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME =
	/^(\d{4}-\d{2}-\d{2})[Tt]\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:[Zz]|[+-]\d{2}:\d{2})$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@.]{1,63}(?:\.[^\s@.]{1,63})+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `Date.parse` takes `2026-02-30` as March 2, so the date must stay the same. */
function isDate(value: string): boolean {
	const time = DATE.test(value) ? Date.parse(value) : Number.NaN;
	return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

/**
 * A check for each `format` that the `t` builders make. Other formats are only annotations. Each
 * check takes linear time.
 */
const FORMAT_CHECKS: Readonly<Record<string, (value: string) => boolean>> = {
	date: isDate,
	'date-time': (value) => {
		const date = DATE_TIME.exec(value)?.[1];
		return date !== undefined && isDate(date) && !Number.isNaN(Date.parse(value));
	},
	// `URL` drops spaces at the ends and takes some inside, a URI has none.
	uri: (value) => !/\s/.test(value) && URL.canParse(value),
	email: (value) => value.length <= 254 && EMAIL.test(value),
	uuid: (value) => UUID.test(value),
};

// Keywords of the schema that `withExpressions` makes. No manifest has them.
const PLAIN_VALUE = 'n8nPlainValue';
const PAGE_EXPRESSION = 'n8nPageExpression';
const BINARY_KEY = 'n8nBinaryKey';

const EXPRESSION_KEYWORDS: KeywordDefinition[] = [
	{ keyword: PLAIN_VALUE, schemaType: 'boolean', validate: () => false },
	{
		keyword: PAGE_EXPRESSION,
		schemaType: 'boolean',
		validate: (_: boolean, data: unknown) => typeof data !== 'string' || isPageExpression(data),
	},
	{
		keyword: BINARY_KEY,
		schemaType: 'boolean',
		validate: (_: boolean, data: unknown) => binaryKeyIssue(data, '') === undefined,
	},
];

/** Each pattern runs through `testPattern`, so a pattern that can backtrack a lot has a timeout. */
const guardedRegExp: RegExpEngine = Object.assign(
	(pattern: string, flags: string) => {
		// A bad pattern throws here, so the schema does not compile.
		testPattern(pattern, '', flags);
		return {
			test: (input: string) => testPattern(pattern, input, flags),
			// ajv keeps one engine for each text.
			toString: () => `/${pattern}/${flags}`,
		};
	},
	{ code: 'testPattern' },
);

const ajv = new Ajv2020({
	allErrors: true,
	// The issue texts need the schema and the value of each error.
	verbose: true,
	// A schema may have keywords that ajv does not know, e.g. `discriminator` and `x-n8n-*`. They are annotations.
	strict: false,
	logger: false,
	addUsedSchema: false,
	code: { regExp: guardedRegExp },
	formats: Object.fromEntries(
		Object.entries(FORMAT_CHECKS).map(([name, check]) => [
			name,
			// n8n stores an empty optional field as '', so only a value has a format.
			{ type: 'string', validate: (value: string) => value === '' || check(value) },
		]),
	),
	keywords: EXPRESSION_KEYWORDS,
});

const EXPRESSION: JsonSchema = { type: 'string', pattern: '^=' };

/** The source schema of each node that `withExpressions` makes, for the issue texts. */
const sources = new WeakMap<AnySchemaObject, JsonSchema>();

const mapValues = (
	map: Record<string, JsonSchema>,
	change: (schema: JsonSchema) => AnySchemaObject,
) => Object.fromEntries(Object.entries(map).map(([key, child]) => [key, change(child)]));

/**
 * `schema` with a `={{ }}` expression allowed in any field except a literal, a page value, and a
 * binary field: n8n resolves the expressions before a run.
 */
function withExpressions(schema: JsonSchema): AnySchemaObject {
	if (schema['x-n8n-binary']) return { [BINARY_KEY]: true };
	const { properties, patternProperties, additionalProperties, items, anyOf, oneOf } = schema;
	const inner = {
		...schema,
		...(properties ? { properties: mapValues(properties, withExpressions) } : {}),
		...(patternProperties
			? { patternProperties: mapValues(patternProperties, withExpressions) }
			: {}),
		...(typeof additionalProperties === 'object'
			? { additionalProperties: withExpressions(additionalProperties) }
			: {}),
		...(items ? { items: withExpressions(items) } : {}),
		...(anyOf ? { anyOf: anyOf.map(withExpressions) } : {}),
		...(oneOf ? { oneOf: oneOf.map(withExpressions) } : {}),
	};
	sources.set(inner, schema);
	const expression = schema['x-n8n-literal']
		? { then: { [PLAIN_VALUE]: true } }
		: schema['x-n8n-page']
			? { then: { [PAGE_EXPRESSION]: true } }
			: {};
	return { if: EXPRESSION, ...expression, else: inner };
}

type Mode = 'plain' | 'expressions';

interface Compiled {
	/** The schema that ajv compiled, so the cache can remove it. */
	readonly target?: AnySchemaObject;
	readonly check?: ValidateFunction;
	/** Why the schema does not compile. */
	readonly refused?: string;
}

/** The keywords that hold what a local `$ref` points to, e.g. `#/$defs/parent`. */
const DEFINITIONS = new Set(['$defs', 'definitions']);

/**
 * `withExpressions` for the root. A local `$ref` points into the root, so the definitions stay
 * at the root, and their fields also accept expressions.
 */
function rootWithExpressions(schema: JsonSchema): AnySchemaObject {
	const definitions = Object.entries(schema).flatMap(([key, value]) =>
		DEFINITIONS.has(key) && isRecord(value)
			? [
					[
						key,
						Object.fromEntries(
							Object.entries(value).map(([name, child]) => [
								name,
								isSchemaNode(child) ? withExpressions(child) : child,
							]),
						),
					],
				]
			: [],
	);
	return { ...withExpressions(schema), ...Object.fromEntries(definitions) };
}

function compile(schema: JsonSchema, mode: Mode): Compiled {
	const target: AnySchemaObject = mode === 'expressions' ? rootWithExpressions(schema) : schema;
	try {
		return { target, check: ajv.compile(target) };
	} catch (error) {
		return { target, refused: `the schema is not valid: ${String(error)}` };
	}
}

/** Compiled schemas by their JSON text, least recently used first. */
const MAX_COMPILED = 256;
const compiledByText = new Map<string, Compiled>();
const compiledByObject = new WeakMap<JsonSchema, Partial<Record<Mode, Compiled>>>();

function cachedOf(key: string, make: () => Compiled): Compiled {
	const compiled = compiledByText.get(key) ?? make();
	compiledByText.delete(key);
	compiledByText.set(key, compiled);
	const [oldest] = compiledByText.keys();
	if (compiledByText.size > MAX_COMPILED && oldest !== undefined) {
		const evicted = compiledByText.get(oldest)?.target;
		compiledByText.delete(oldest);
		if (evicted) ajv.removeSchema(evicted);
	}
	return compiled;
}

function compiledOf(schema: JsonSchema, mode: Mode): Compiled {
	const known = compiledByObject.get(schema)?.[mode];
	if (known) return known;
	const compiled = cachedOf(`${mode}:${JSON.stringify(schema)}`, () => compile(schema, mode));
	compiledByObject.set(schema, { ...compiledByObject.get(schema), [mode]: compiled });
	return compiled;
}

const SHOWN_LENGTH = 80;

/** Issues go to logs and to the AI builder, so a value never shows a secret or a whole body. */
function shown(value: unknown, at: string, node: JsonSchema): string {
	// An item of a list has the key of the list.
	const key = (at.split('.').pop() ?? '').replace(/(?:\[\d+\])+$/, '');
	if (node.writeOnly || isSensitiveKey(key)) return '[REDACTED]';
	const text = scrubSecretsInText(JSON.stringify(value) ?? String(value));
	return text.length > SHOWN_LENGTH ? `${text.slice(0, SHOWN_LENGTH - 1)}…` : text;
}

const describe = (schema: JsonSchema) =>
	schema.enum
		? `one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`
		: String(schema.type ?? 'a value');

/** Where an error is: its path in the issue text, and its place in the order of the value. */
interface Place {
	readonly at: string;
	/** The index of each step in its object or list, plus one. */
	readonly order: readonly number[];
}

/**
 * The place of a key in its object, plus one. It reads the keys of each object once, so the
 * issues of a wide object take linear time.
 */
function keyPlacesOf() {
	const places = new WeakMap<object, ReadonlyMap<string, number>>();
	return (object: object, key: string) => {
		const known =
			places.get(object) ?? new Map(Object.keys(object).map((name, index) => [name, index + 1]));
		places.set(object, known);
		return known.get(key) ?? 0;
	};
}

function placeOf(
	root: string,
	value: unknown,
	instancePath: string,
	keyPlace: (object: object, key: string) => number,
): Place {
	const steps = instancePath
		.split('/')
		.slice(1)
		.map((step) => step.replaceAll('~1', '/').replaceAll('~0', '~'));
	const walked = steps.reduce(
		({ at, order, current }, step) =>
			Array.isArray(current)
				? {
						at: `${at}[${step}]`,
						order: [...order, Number(step) + 1],
						current: current[Number(step)],
					}
				: {
						at: `${at}.${step}`,
						order: [...order, isRecord(current) ? keyPlace(current, step) : 1],
						current: isRecord(current) ? current[step] : undefined,
					},
		{ at: root, order: Array.of<number>(), current: value },
	);
	return { at: walked.at, order: walked.order };
}

const isUnion = (error: ErrorObject) => error.keyword === 'anyOf' || error.keyword === 'oneOf';
const isUnder = (error: ErrorObject, schemaPath: string) =>
	error.schemaPath === schemaPath || error.schemaPath.startsWith(`${schemaPath}/`);
const nodePathOf = (error: ErrorObject) =>
	error.schemaPath.slice(0, error.schemaPath.lastIndexOf('/'));
/** A `schemaPath` has no item index, so each check of two errors also compares the values. */
const nodeKeyOf = (error: ErrorObject) => `${error.instancePath} ${nodePathOf(error)}`;

/** The instance path and each of its parents: `/a/0` gives `''`, `/a` and `/a/0`. */
const instancePathsOf = ({ instancePath }: ErrorObject) => {
	const steps = instancePath.split('/').slice(1);
	return ['', ...steps.map((_, index) => `/${steps.slice(0, index + 1).join('/')}`)];
};

/** The entries by key. */
function groupBy<T>(entries: readonly T[], keyOf: (entry: T) => string): Map<string, T[]> {
	const groups = new Map<string, T[]>();
	for (const entry of entries) {
		const key = keyOf(entry);
		const group = groups.get(key);
		if (group) group.push(entry);
		else groups.set(key, [entry]);
	}
	return groups;
}

/** The entries of `groups` at the value of `error` and at each value that holds it. */
const aroundOf = <T>(groups: ReadonlyMap<string, readonly T[]>, error: ErrorObject) =>
	instancePathsOf(error).flatMap((at) => groups.get(at) ?? []);

/** ajv compiled the value as a schema, after the meta-schema checked it. */
const isSchemaNode = (value: unknown): value is JsonSchema => isRecord(value);

/** The schema of an error, as the caller wrote it. */
const nodeOf = ({ parentSchema }: ErrorObject): JsonSchema => {
	const source = parentSchema && sources.get(parentSchema);
	return source ?? (isSchemaNode(parentSchema) ? parentSchema : {});
};

/** A union, and the branch whose errors explain it: the branch of the tag of a variant. */
interface Union {
	readonly error: ErrorObject;
	readonly branch?: string;
}

/** The error is in a branch of the union, and the branch does not explain the union. */
const isHiddenBy = (union: Union, error: ErrorObject) =>
	error.schemaPath.startsWith(`${union.error.schemaPath}/`) &&
	!(union.branch !== undefined && isUnder(error, union.branch));

/**
 * The failing unions, by the instance path of their value, without those inside another union.
 * The errors of the branches of a union explain it only for a variant, by its tag. For another
 * union, one issue tells that no branch matches.
 */
function unionsOf(errors: readonly ErrorObject[]): Map<string, Union[]> {
	const unions = new Map<string, Union[]>();
	const sorted = errors.filter(isUnion).sort((a, b) => a.schemaPath.length - b.schemaPath.length);
	for (const error of sorted) {
		if (aroundOf(unions, error).some((union) => isHiddenBy(union, error))) continue;
		const node = nodeOf(error);
		const name = node.discriminator?.propertyName;
		const branches = node.oneOf ?? [];
		const branch =
			name === undefined || error.keyword !== 'oneOf'
				? undefined
				: variantBranchOf(branches, name, error.data);
		const index = branch ? branches.indexOf(branch) : -1;
		const union = index < 0 ? { error } : { error, branch: `${error.schemaPath}/${index}` };
		unions.set(error.instancePath, [...(unions.get(error.instancePath) ?? []), union]);
	}
	return unions;
}

/** The first of these that fails at a node tells what the value must be: the others add noise. */
const LEADS = ['const', 'enum', 'type'];

function issueOf(error: ErrorObject, at: string, union: Union | undefined): string {
	const node = nodeOf(error);
	const { data } = error;
	switch (error.keyword) {
		case 'anyOf':
		case 'oneOf': {
			const name = node.discriminator?.propertyName;
			if (name === undefined || union?.branch !== undefined) {
				return `${at}: does not match any allowed shape`;
			}
			const tags = (node.oneOf ?? []).map((branch) => JSON.stringify(variantTagOf(branch, name)));
			return `${at}: needs "${name}" set to one of ${tags.join(', ')}`;
		}
		case 'required':
			return `${at}.${String(error.params.missingProperty)}: is required`;
		case 'const':
			return `${at}: must be ${JSON.stringify(node.const)}`;
		case 'enum':
		case 'type':
			return `${at}: must be ${describe(node)}, got ${shown(data, at, node)}`;
		case 'minLength':
			return node.minLength === 1
				? `${at}: must not be empty`
				: `${at}: must have at least ${String(node.minLength)} characters`;
		case 'pattern':
			return `${at}: ${shown(data, at, node)} is not ${node['x-n8n-hint'] ?? String(node.pattern)}`;
		case 'format': {
			const format = String(node.format);
			const example = FORMAT_EXAMPLES[format];
			return `${at}: ${shown(data, at, node)} is not a ${format}${example ? `, e.g. ${example}` : ''}`;
		}
		case 'minimum':
			return `${at}: must be at least ${String(node.minimum)}`;
		case 'maximum':
			return `${at}: must be at most ${String(node.maximum)}`;
		case 'minItems':
			return `${at}: needs at least ${String(node.minItems)} item(s)`;
		case PLAIN_VALUE:
			return `${at}: must be a plain value, not an expression`;
		case PAGE_EXPRESSION:
			return `${at}: must read fields of $response, e.g. (page) => page.body.next_cursor`;
		case BINARY_KEY:
			return binaryKeyIssue(data, at) ?? `${at}: must be the key of a binary`;
		default:
			return `${at}: ${error.message ?? `fails ${error.keyword}`}`;
	}
}

const compareOrders = (a: readonly number[], b: readonly number[]): number => {
	const index = a.findIndex((step, at) => step !== b[at]);
	return index < 0 ? a.length - b.length : (a[index] ?? 0) - (b[index] ?? 0);
};

/**
 * The SDK issue texts for the errors of ajv, in the order of the value: the issues of a node,
 * then those of its fields, then its unknown fields in one issue.
 */
function issuesOf(errors: readonly ErrorObject[], value: unknown, root: string): string[] {
	// n8n leaves an empty field undefined, so no value is no issue. `if` only repeats its branch.
	const relevant = errors.filter((error) => error.keyword !== 'if' && error.data !== undefined);
	const unions = unionsOf(relevant);
	const unionOf = (error: ErrorObject) =>
		unions.get(error.instancePath)?.find((union) => union.error === error);
	const visible = relevant.filter(
		(error) =>
			(!isUnion(error) || unionOf(error) !== undefined) &&
			!aroundOf(unions, error).some((union) => isHiddenBy(union, error)),
	);
	const rank = (error: ErrorObject) => LEADS.indexOf(error.keyword);
	// A failing union tells what the value must be before the other keywords of its node.
	const unionNodes = new Set(visible.filter(isUnion).map(nodeKeyOf));
	const kept = visible.filter((error) => rank(error) < 0 || !unionNodes.has(nodeKeyOf(error)));
	const firstRank = new Map<string, number>();
	for (const error of kept.filter((candidate) => rank(candidate) >= 0)) {
		const key = nodeKeyOf(error);
		firstRank.set(key, Math.min(firstRank.get(key) ?? Infinity, rank(error)));
	}
	const leads = groupBy(
		kept.filter((error) => rank(error) >= 0 && firstRank.get(nodeKeyOf(error)) === rank(error)),
		(error) => error.instancePath,
	);
	// A variant whose tagged branch has errors needs no issue of its own.
	const explained = new Set(
		kept.flatMap((error) =>
			aroundOf(unions, error)
				.filter((union) => union.error !== error && union.branch && isUnder(error, union.branch))
				.map((union) => union.error),
		),
	);
	const shownErrors = kept.filter(
		(error) =>
			!explained.has(error) &&
			!aroundOf(leads, error).some((lead) => lead !== error && isUnder(error, nodePathOf(lead))),
	);
	const unknown = groupBy(
		shownErrors.filter((error) => error.keyword === 'additionalProperties'),
		(error) => `${error.instancePath} ${error.schemaPath}`,
	);
	const keyPlace = keyPlacesOf();
	const issues = shownErrors.flatMap((error) => {
		const place = placeOf(root, value, error.instancePath, keyPlace);
		if (error.keyword !== 'additionalProperties') {
			return [{ order: [...place.order, 0], text: issueOf(error, place.at, unionOf(error)) }];
		}
		const group = unknown.get(`${error.instancePath} ${error.schemaPath}`) ?? [];
		// One issue for all unknown fields of an object, at its first one.
		if (group[0] !== error) return [];
		const keys = group.map((other) => String(other.params.additionalProperty));
		const allowed = Object.keys(nodeOf(error).properties ?? {}).join(', ');
		return [
			{
				order: [...place.order, Infinity],
				text: `${place.at}: unknown field(s) ${keys.join(', ')}. Allowed: ${allowed}`,
			},
		];
	});
	return issues.sort((a, b) => compareOrders(a.order, b.order)).map(({ text }) => text);
}

/** What `validate` takes besides the value and the schema. */
export interface ValidateOptions {
	/**
	 * The path of the value in the issues.
	 *
	 * @defaultValue `'input'`
	 */
	readonly path?: string;
	/** Accept `={{ }}` expression strings, as at build time. */
	readonly allowExpressions?: boolean;
}

function run(compiled: Compiled, value: unknown, root: string): string[] {
	if (compiled.refused !== undefined) return [`${root}: ${compiled.refused}`];
	const { check } = compiled;
	if (!check || check(value)) return [];
	return issuesOf(check.errors ?? [], value, root);
}

/**
 * Validate a value against a JSON Schema 2020-12 schema, one issue a line, e.g.
 * `input.id: is required`. `undefined` is valid everywhere. The formats `date`, `date-time`,
 * `uri`, `email` and `uuid` are checked, except on an empty string. With `allowExpressions`, any
 * field except a discriminator, an `x-n8n-literal` field, or a binary field may hold a `={{ }}`
 * string (build time); at run time n8n has already resolved them.
 */
export function validate(
	value: unknown,
	schema: JsonSchema,
	options: ValidateOptions = {},
): string[] {
	if (value === undefined) return [];
	const mode = options.allowExpressions ? 'expressions' : 'plain';
	return run(compiledOf(schema, mode), value, options.path ?? 'input');
}

/**
 * The issues of the fixed values of a contract node, as a build or a save checks them. A missing
 * field and a placeholder are no issue, so an unfinished node saves. On a tool node, a field that
 * is one `$fromAI()` call is no issue: the model fills it and the tool checks it. Expressions wait
 * for the run.
 */
export function fixedInputIssues(
	input: Readonly<Record<string, unknown>>,
	schema: JsonSchema,
	{ tool = false }: { readonly tool?: boolean } = {},
): string[] {
	const fixed = Object.fromEntries(
		Object.entries(input).filter(
			([, value]) =>
				!hasPlaceholderDeep(value) &&
				!(tool && typeof value === 'string' && isFromAIOnlyExpression(value)),
		),
	);
	return validate(fixed, schema, { allowExpressions: true }).filter(
		(issue) => !issue.endsWith(': is required'),
	);
}

/** The largest schema that a guest may send, about 5 times the largest shipped contract schema. */
const MAX_GUEST_SCHEMA_BYTES = 256 * 1024;
const MAX_GUEST_SCHEMA_DEPTH = 64;

/** The depth of `value`, counted to one level past `limit`. */
const depthOf = (value: unknown, limit: number): number =>
	limit < 0 || typeof value !== 'object' || value === null
		? 0
		: 1 +
			Object.values(value).reduce<number>(
				(most, child) => Math.max(most, depthOf(child, limit - 1)),
				0,
			);

/** Each `pattern` and `patternProperties` key, wherever it is. */
const patternsOf = (value: unknown): string[] =>
	typeof value !== 'object' || value === null
		? []
		: Object.entries(value).flatMap(([key, child]) => [
				...(key === 'pattern' && typeof child === 'string' ? [child] : []),
				...(key === 'patternProperties' && isRecord(child) ? Object.keys(child) : []),
				...patternsOf(child),
			]);

/** The value is a schema that matches the JSON Schema 2020-12 meta-schema. */
const isJsonSchema = (value: unknown): value is JsonSchema =>
	isRecord(value) && ajv.validateSchema(value) === true;

/** The schema of an untrusted bundle, compiled, or why the host does not compile it. */
function untrustedCompile(schema: unknown, text: string, mode: Mode): Compiled {
	const bytes = Buffer.byteLength(text);
	if (bytes > MAX_GUEST_SCHEMA_BYTES) {
		return { refused: `the schema has ${bytes} bytes, more than ${MAX_GUEST_SCHEMA_BYTES}` };
	}
	const slow = patternsOf(schema).find((pattern) => stepsPerCharOf(pattern) === undefined);
	if (slow !== undefined) {
		return {
			refused: `the schema pattern ${JSON.stringify(slow)} can take more than linear time`,
		};
	}
	if (isJsonSchema(schema)) return compile(schema, mode);
	return {
		refused: isRecord(schema)
			? `the schema is not valid: ${ajv.errorsText(ajv.errors)}`
			: 'the schema is not an object',
	};
}

/**
 * `validate` for a schema of a bundle that can come from anyone, e.g. one that a sandbox guest
 * sends through the `schema` import. The host refuses a schema that is too large, too deep, or
 * has a pattern that can take more than linear time, before it compiles it. Unlike `validate`,
 * it gives the issue of a refused schema also for an `undefined` value.
 */
export function validateUntrusted(
	value: unknown,
	schema: unknown,
	options: ValidateOptions = {},
): string[] {
	const root = options.path ?? 'input';
	// The depth check comes first: `JSON.stringify` overflows the stack on a very deep value.
	if (depthOf(schema, MAX_GUEST_SCHEMA_DEPTH) > MAX_GUEST_SCHEMA_DEPTH) {
		return [`${root}: the schema nests deeper than ${MAX_GUEST_SCHEMA_DEPTH} levels`];
	}
	const mode = options.allowExpressions ? 'expressions' : 'plain';
	const text = JSON.stringify(schema) ?? '';
	// Other keys than `validate` uses, so the guards apply also to a text that the host compiled.
	const compiled = cachedOf(`untrusted:${mode}:${text}`, () =>
		untrustedCompile(schema, text, mode),
	);
	if (compiled.refused !== undefined) return [`${root}: ${compiled.refused}`];
	return value === undefined ? [] : run(compiled, value, root);
}
