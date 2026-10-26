import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { zodToDraft202012 } from '@n8n/ai-utilities/json-schema';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export type ShapeToStandardSchemaOptions = {
	/**
	 * Accept JSON-encoded strings for arguments that expect an array, object,
	 * number or boolean. Use it for tool input only: some MCP clients send typed
	 * arguments as strings, for example `"[\"error\"]"` or `"4"`.
	 */
	decodeJsonStringArgs?: boolean;
};

/** Parsed types a JSON-encoded string can stand in for. */
const JSON_DECODABLE_TYPES: ReadonlySet<string> = new Set([
	z.ZodParsedType.array,
	z.ZodParsedType.object,
	z.ZodParsedType.number,
	z.ZodParsedType.boolean,
]);

// Each pass decodes one level, e.g. a stringified object whose fields are
// stringified too. The cap keeps a hostile payload from looping.
const MAX_DECODE_PASSES = 3;

function readChild(container: unknown, key: string | number): unknown {
	if (Array.isArray(container) && typeof key === 'number') return container[key];
	if (isRecord(container) && typeof key === 'string' && Object.hasOwn(container, key)) {
		return container[key];
	}
	return undefined;
}

function tryParseJson(text: string): unknown {
	try {
		const parsed: unknown = JSON.parse(text);
		return parsed;
	} catch {
		return undefined;
	}
}

/**
 * Replaces the string at `path` with its JSON-decoded value when the decoded
 * value has the `expected` parsed type. Returns whether it replaced the value.
 */
function decodeStringAtPath(
	root: Record<string, unknown>,
	path: Array<string | number>,
	expected: string,
): boolean {
	const key = path.at(-1);
	if (key === undefined || key === '__proto__') return false;

	let container: unknown = root;
	for (const segment of path.slice(0, -1)) container = readChild(container, segment);

	const current = readChild(container, key);
	if (typeof current !== 'string') return false;

	const decoded = tryParseJson(current);
	if (decoded === undefined || z.getParsedType(decoded) !== expected) return false;

	if (Array.isArray(container) && typeof key === 'number') {
		container[key] = decoded;
		return true;
	}
	if (isRecord(container) && typeof key === 'string') {
		container[key] = decoded;
		return true;
	}
	return false;
}

/**
 * Returns a copy of `value` in which every string that zod rejected in place
 * of an array, object, number or boolean is JSON-decoded. Returns `undefined`
 * when nothing could be decoded.
 */
function decodeJsonStringArgs(value: unknown, issues: z.ZodIssue[]): unknown {
	if (!isRecord(value)) return undefined;

	const copy = structuredClone(value);
	let changed = false;
	for (const issue of issues) {
		if (
			issue.code === z.ZodIssueCode.invalid_type &&
			issue.received === z.ZodParsedType.string &&
			JSON_DECODABLE_TYPES.has(issue.expected)
		) {
			changed = decodeStringAtPath(copy, issue.path, issue.expected) || changed;
		}
	}
	return changed ? copy : undefined;
}

/**
 * Bridges a classic-zod raw shape to the Standard Schema interface the v2 MCP
 * SDK requires. The SDK only uses `~standard.validate` (argument checking) and
 * `~standard.jsonSchema` (the shape advertised in tools/list); validation stays
 * on the exact zod object we validate with today, so tool semantics don't
 * change.
 */
export function shapeToStandardSchema<Shape extends z.ZodRawShape>(
	shape: Shape,
	options: ShapeToStandardSchemaOptions = {},
): StandardSchemaWithJSON<
	z.objectInputType<Shape, z.ZodTypeAny>,
	z.objectOutputType<Shape, z.ZodTypeAny>
> {
	const schema = z.object(shape);
	// `$refStrategy: 'none'` inlines schema instances that are reused across the
	// shape. The default strategy dedupes a reused instance into a `$ref` to an
	// arbitrary `#/properties/...` path, which common client-side validators
	// (e.g. Zod v4's `fromJSONSchema`) refuse to resolve — they only follow refs
	// into `$defs`/`definitions`. Inlining also matches Zod v4's `toJSONSchema`
	// default (`reused: 'inline'`), the migration target for this bridge.
	const jsonSchema = zodToDraft202012(schema, { $refStrategy: 'none' });

	const parse = (value: unknown) => {
		let result = schema.safeParse(value);
		if (!options.decodeJsonStringArgs) return result;

		// Strict parse first, so valid input behaves exactly as before. Only a
		// rejected string in a typed slot is decoded and parsed again.
		let current = value;
		for (let pass = 0; pass < MAX_DECODE_PASSES && !result.success; pass++) {
			const decoded = decodeJsonStringArgs(current, result.error.issues);
			if (decoded === undefined) break;
			current = decoded;
			result = schema.safeParse(current);
		}
		return result;
	};

	return {
		'~standard': {
			version: 1,
			vendor: 'n8n-zod-classic',
			validate: (value) => {
				const result = parse(value);
				return result.success
					? { value: result.data }
					: {
							issues: result.error.issues.map((issue) => ({
								message: issue.message,
								path: issue.path,
							})),
						};
			},
			jsonSchema: {
				input: () => jsonSchema,
				output: () => jsonSchema,
			},
		},
	};
}
