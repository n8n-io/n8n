/**
 * Schema-shaped placeholder items.
 *
 * A simulated node with no usable fixture used to be pinned with one empty
 * item. Downstream expressions then resolve to undefined, so the rest of the
 * chain runs against nothing and the verification still reports success. This
 * module builds one item that carries the node's real field names, taken from
 * its `__schema__`, its declared field contract, or its AI-root envelope.
 *
 * The values are deliberately generic. This is the floor that keeps a chain
 * alive, not a fixture: correctness is the generator's job.
 *
 * Pure: the caller passes the clock so date-shaped fields stay inside the
 * execution window.
 */

import { isRecord } from '@n8n/utils/is-record';

import { buildAiRootPlaceholder } from './ai-root-shapes';
import type { DataTableColumnInfo, NodeSchemaContext } from './types';

/** Nesting levels to expand before an object/array becomes an empty stub. */
const MAX_DEPTH = 4;
/** Properties to keep per object, so a wide schema cannot bloat the pin data. */
const MAX_PROPERTIES = 40;

const PLACEHOLDER_STRING = 'sample';

export interface PlaceholderItemOptions {
	/** Reference time for date-shaped fields. Passed in to keep this module pure. */
	now: Date;
}

/**
 * Build the single item a simulated node emits when it has no generated
 * fixture. Returns `{}` only when nothing describes the node's output.
 */
export function buildSchemaPlaceholderItem(
	ctx: NodeSchemaContext | undefined,
	options: PlaceholderItemOptions,
): Record<string, unknown> {
	if (!ctx) return {};

	const declared = ctx.declaredFields;
	// A Data Table row must carry exactly its columns, so the static
	// `__schema__` (which only knows the system columns) is discarded.
	if (declared?.exact) {
		return fromDeclaredKeys(declared.keys, ctx.dataTableColumns, options);
	}

	const fromSchema = buildFromSchema(ctx.schema, options);
	const withDeclared = declared
		? overlayDeclaredFields(fromSchema, declared.keys, declared.envelopeKey, options)
		: fromSchema;
	if (Object.keys(withDeclared).length > 0) return withDeclared;

	return buildAiRootPlaceholder(ctx.nodeType, PLACEHOLDER_STRING) ?? {};
}

/** Merge the declared field names in, under their envelope key when they have one. */
function overlayDeclaredFields(
	base: Record<string, unknown>,
	keys: string[],
	envelopeKey: string | undefined,
	options: PlaceholderItemOptions,
): Record<string, unknown> {
	if (keys.length === 0) return base;
	const fields = fromDeclaredKeys(keys, undefined, options);
	if (!envelopeKey) return { ...base, ...fields };
	const existing = isRecord(base[envelopeKey]) ? base[envelopeKey] : {};
	return { ...base, [envelopeKey]: { ...existing, ...fields } };
}

function fromDeclaredKeys(
	keys: string[],
	columns: DataTableColumnInfo[] | undefined,
	options: PlaceholderItemOptions,
): Record<string, unknown> {
	const typeByColumn = new Map((columns ?? []).map((column) => [column.name, column.type]));
	return Object.fromEntries(
		keys
			.slice(0, MAX_PROPERTIES)
			.map((key) => [key, declaredValue(key, typeByColumn.get(key), options)]),
	);
}

/** Data Table columns carry a type; everything else falls back to the field name's shape. */
function declaredValue(
	key: string,
	columnType: string | undefined,
	options: PlaceholderItemOptions,
): unknown {
	switch (columnType) {
		case 'number':
			return 1;
		case 'boolean':
			return true;
		case 'date':
			return options.now.toISOString();
		case 'string':
			return PLACEHOLDER_STRING;
		default:
			return valueForKeyName(key, options);
	}
}

/**
 * The `id`/`createdAt` system columns and their look-alikes are read
 * numerically or as dates downstream, so a bare string there breaks the very
 * expressions this floor exists to keep alive.
 */
function valueForKeyName(key: string, options: PlaceholderItemOptions): unknown {
	const lower = key.toLowerCase();
	if (lower === 'id') return 1;
	if (lower.endsWith('at') && (lower.includes('creat') || lower.includes('updat'))) {
		return options.now.toISOString();
	}
	return PLACEHOLDER_STRING;
}

/** Synthesize an item from a node `__schema__`. Returns `{}` for anything unusable. */
function buildFromSchema(
	schema: Record<string, unknown> | undefined,
	options: PlaceholderItemOptions,
): Record<string, unknown> {
	if (!schema) return {};
	const resolved = resolveComposite(schema);
	// Some nodes record their output as an array of rows; the item shape is
	// then the array's element schema.
	const target =
		resolveType(resolved) === 'array' && isRecord(resolved.items) ? resolved.items : resolved;
	const value = placeholderValue(target, 0, options);
	return isRecord(value) ? value : {};
}

function placeholderValue(
	schema: unknown,
	depth: number,
	options: PlaceholderItemOptions,
): unknown {
	if (!isRecord(schema)) return PLACEHOLDER_STRING;
	const resolved = resolveComposite(schema);

	if ('const' in resolved) return resolved.const;
	if (Array.isArray(resolved.enum) && resolved.enum.length > 0) return resolved.enum[0];
	if (Array.isArray(resolved.examples) && resolved.examples.length > 0) return resolved.examples[0];
	if ('default' in resolved) return resolved.default;

	switch (resolveType(resolved)) {
		case 'object': {
			if (depth >= MAX_DEPTH) return {};
			const properties = isRecord(resolved.properties) ? resolved.properties : undefined;
			if (!properties) return {};
			return Object.fromEntries(
				Object.entries(properties)
					.slice(0, MAX_PROPERTIES)
					.map(([key, definition]) => [key, propertyValue(key, definition, depth + 1, options)]),
			);
		}
		case 'array': {
			// One element keeps downstream item-level expressions resolvable; an
			// unspecified element shape stays empty rather than inventing one.
			if (depth >= MAX_DEPTH || !isRecord(resolved.items)) return [];
			return [placeholderValue(resolved.items, depth + 1, options)];
		}
		case 'integer':
		case 'number':
			return 1;
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'string':
			return stringValue(resolved, options);
		default:
			return PLACEHOLDER_STRING;
	}
}

/** A property with neither a type nor a literal value still has a name worth honouring. */
function propertyValue(
	key: string,
	definition: unknown,
	depth: number,
	options: PlaceholderItemOptions,
): unknown {
	if (isRecord(definition)) {
		const resolved = resolveComposite(definition);
		const hasLiteral =
			'const' in resolved ||
			'default' in resolved ||
			Array.isArray(resolved.enum) ||
			Array.isArray(resolved.examples);
		if (!hasLiteral && resolveType(resolved) === undefined) return valueForKeyName(key, options);
	}
	return placeholderValue(definition, depth, options);
}

function stringValue(schema: Record<string, unknown>, options: PlaceholderItemOptions): string {
	const format = typeof schema.format === 'string' ? schema.format : undefined;
	switch (format) {
		case 'date-time':
			return options.now.toISOString();
		case 'date':
			return options.now.toISOString().slice(0, 10);
		case 'time':
			return options.now.toISOString().slice(11, 19);
		case 'email':
			return 'jane@example.com';
		case 'uri':
		case 'url':
			return 'https://example.com/sample';
		case 'uuid':
			return '00000000-0000-4000-8000-000000000000';
		default:
			return PLACEHOLDER_STRING;
	}
}

/** Collapse `allOf`/`anyOf`/`oneOf` onto the first branch that carries a shape. */
function resolveComposite(schema: Record<string, unknown>): Record<string, unknown> {
	for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
		const branches = schema[key];
		if (!Array.isArray(branches)) continue;
		const branch = branches.find((candidate) => isRecord(candidate));
		if (isRecord(branch)) return { ...schema, ...branch };
	}
	return schema;
}

/** JSON Schema `type`, tolerating union types and inferring from the keywords. */
function resolveType(schema: Record<string, unknown>): string | undefined {
	const declared = schema.type;
	if (typeof declared === 'string') return declared;
	if (Array.isArray(declared)) {
		const entries: unknown[] = declared;
		const usable = entries.find((entry) => typeof entry === 'string' && entry !== 'null');
		if (typeof usable === 'string') return usable;
		if (entries.includes('null')) return 'null';
	}
	if (isRecord(schema.properties)) return 'object';
	if (isRecord(schema.items)) return 'array';
	return undefined;
}
