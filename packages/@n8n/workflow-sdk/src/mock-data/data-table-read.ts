import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

// Mirrors the Data Table node's `get` parameters; absent keys mean the node defaults.
const ROWS_LIMIT_DEFAULT = 50;

const conditionSchema = z.object({
	keyName: z.string().min(1),
	condition: z.string().default('eq'),
	keyValue: z.unknown().optional(),
});

// An expression-filled field reads as its widest setting, so the rest of the filter stays usable.
const readParametersSchema = z.object({
	resource: z.string().default('row'),
	operation: z.string().default('insert'),
	matchType: z.enum(['anyCondition', 'allConditions']).catch('anyCondition'),
	filters: z
		.object({ conditions: z.array(conditionSchema).default([]) })
		.default({ conditions: [] }),
	returnAll: z.boolean().default(false).catch(true),
	limit: z.unknown(),
	orderBy: z.boolean().default(false).catch(false),
	orderByColumn: z.string().default('createdAt'),
	orderByDirection: z.enum(['ASC', 'DESC']).default('DESC').catch('DESC'),
});

export type DataTableReadCondition = z.infer<typeof conditionSchema>;

export interface DataTableReadParameters {
	matchType: 'anyCondition' | 'allConditions';
	conditions: DataTableReadCondition[];
	returnAll: boolean;
	/** Absent when the node's limit is an expression. */
	limit?: number;
	sortBy?: [column: string, direction: 'ASC' | 'DESC'];
}

export interface DataTableLocator {
	mode: 'name' | 'id';
	value: string;
	/** The table name an id locator caches, when it has one. */
	cachedName?: string;
}

/** A Data Table node's `dataTableId`: the id, or the name in `name` mode. The eval
 *  server prepares the table it names, and the eval harness keys its run lock on it,
 *  so both read it here and cannot drift apart. An expression names no table before
 *  the run, so it reads as nothing. */
export function readDataTableLocator(dataTableId: unknown): DataTableLocator | undefined {
	const locator = isRecord(dataTableId) ? dataTableId : undefined;
	const value = literalParameter(locator ? locator.value : dataTableId).literal;
	if (typeof value !== 'string' || value.length === 0) return undefined;
	if (locator?.mode === 'name') return { mode: 'name', value };
	const cachedName = locator?.cachedResultName;
	return typeof cachedName === 'string' && cachedName.length > 0
		? { mode: 'id', value, cachedName }
		: { mode: 'id', value };
}

/** A `=` prefix puts a parameter in expression mode; without `{{ }}` the rest is a literal. */
export function literalParameter(value: unknown): { literal: unknown; isExpression: boolean } {
	if (typeof value !== 'string' || !value.startsWith('=')) {
		return { literal: value, isExpression: false };
	}
	return value.includes('{{')
		? { literal: undefined, isExpression: true }
		: { literal: value.slice(1), isExpression: false };
}

export function readDataTableReadParameters(node: {
	type: string;
	parameters?: unknown;
}): DataTableReadParameters | undefined {
	if (node.type !== 'n8n-nodes-base.dataTable') return undefined;
	const parsed = readParametersSchema.safeParse(node.parameters ?? {});
	if (!parsed.success || parsed.data.resource !== 'row' || parsed.data.operation !== 'get') {
		return undefined;
	}
	const { matchType, filters, returnAll, limit, orderBy, orderByColumn, orderByDirection } =
		parsed.data;
	const read: DataTableReadParameters = { matchType, conditions: filters.conditions, returnAll };
	if (limit === undefined) read.limit = ROWS_LIMIT_DEFAULT;
	else if (typeof limit === 'number' && Number.isInteger(limit) && limit > 0) read.limit = limit;
	const column = literalParameter(orderByColumn);
	if (orderBy && typeof column.literal === 'string' && column.literal !== '') {
		read.sortBy = [column.literal, orderByDirection];
	}
	return read;
}

export function describeDataTableRead(read: DataTableReadParameters): string {
	const joiner = read.matchType === 'allConditions' ? ' AND ' : ' OR ';
	const filter =
		read.conditions.length === 0
			? 'no filter (every row)'
			: read.conditions
					.map(
						(c) =>
							`\`${c.keyName}\` ${c.condition}${c.keyValue === undefined ? '' : ` ${JSON.stringify(c.keyValue)}`}`,
					)
					.join(joiner);
	const order = read.sortBy ? `; ordered by \`${read.sortBy[0]}\` ${read.sortBy[1]}` : '';
	const cap = read.returnAll
		? ''
		: read.limit === undefined
			? '; the row limit is an expression'
			: `; at most ${String(read.limit)} row(s)`;
	return `${filter}${order}${cap}`;
}
