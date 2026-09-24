import type { INode, INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod';

// Mirrors the Data Table node's `get` parameters (nodes-base DataTable/common/selectMany.ts,
// actions/row/get.operation.ts): absent keys mean the node defaults.
const ROWS_LIMIT_DEFAULT = 50;

const conditionSchema = z.object({
	keyName: z.string().min(1),
	condition: z.string().default('eq'),
	keyValue: z.unknown().optional(),
});

const readParametersSchema = z.object({
	matchType: z.enum(['anyCondition', 'allConditions']).default('anyCondition'),
	filters: z
		.object({ conditions: z.array(conditionSchema).default([]) })
		.default({ conditions: [] }),
	returnAll: z.boolean().default(false),
	limit: z.number().int().positive().default(ROWS_LIMIT_DEFAULT),
});

type Condition = z.infer<typeof conditionSchema>;
type Row = INodeExecutionData['json'];
type RowPredicate = (row: Row) => boolean;

export interface PinnedReadFilterResult {
	items: INodeExecutionData[];
	/** Conditions the harness could not apply; the judge reads them as framework flags. */
	warnings: string[];
}

/**
 * Apply a pinned Data Table read's own conditions, match type and limit to the
 * rows generated for it, the way the real node would. A condition the harness
 * cannot evaluate (an expression, an unknown operator) counts as a match and is
 * reported; the limit is skipped in that case so no row the real node might
 * have returned is dropped. An empty pin stays empty.
 */
export function applyDataTableReadParameters(
	node: INode,
	items: INodeExecutionData[],
): PinnedReadFilterResult {
	const parsed = readParametersSchema.safeParse(node.parameters ?? {});
	if (!parsed.success) {
		return {
			items,
			warnings: [
				`Pinned Data Table read "${node.name}": its filter parameters could not be read (${parsed.error.issues[0]?.message ?? 'invalid'}); rows were left as generated`,
			],
		};
	}
	const { matchType, filters, returnAll, limit } = parsed.data;
	const warnings: string[] = [];
	const evaluators = filters.conditions.map((condition) =>
		conditionPredicate(condition, node.name, warnings),
	);
	const predicates = evaluators.filter((p): p is RowPredicate => p !== undefined);
	const allEvaluable = predicates.length === evaluators.length;

	let kept = items;
	if (predicates.length > 0) {
		kept = items.filter((item) =>
			matchType === 'allConditions'
				? predicates.every((p) => p(item.json))
				: // An unevaluable condition counts as a match, so a partial OR keeps every row.
					!allEvaluable || predicates.some((p) => p(item.json)),
		);
	}
	if (!returnAll && allEvaluable) kept = kept.slice(0, limit);
	return { items: kept, warnings };
}

function conditionPredicate(
	condition: Condition,
	nodeName: string,
	warnings: string[],
): RowPredicate | undefined {
	const { keyName, condition: operator, keyValue } = condition;
	if (typeof keyValue === 'string' && keyValue.startsWith('=')) {
		warnings.push(
			`Pinned Data Table read "${nodeName}": the condition on "${keyName}" uses an expression that cannot be evaluated before the run; rows were not filtered by it`,
		);
		return undefined;
	}
	switch (operator) {
		case 'isEmpty':
			return (row) => isEmptyCell(row[keyName]);
		case 'isNotEmpty':
			return (row) => !isEmptyCell(row[keyName]);
		case 'isTrue':
			return (row) => row[keyName] === true || row[keyName] === 'true';
		case 'isFalse':
			return (row) => row[keyName] === false || row[keyName] === 'false';
		case 'eq':
			return (row) => cellEquals(row[keyName], keyValue);
		case 'neq':
			return (row) => !cellEquals(row[keyName], keyValue);
		case 'gt':
		case 'gte':
		case 'lt':
		case 'lte':
			return (row) => compareCells(row[keyName], keyValue, operator);
		case 'like':
			return (row) => matchesLike(row[keyName], keyValue, true);
		case 'ilike':
			return (row) => matchesLike(row[keyName], keyValue, false);
		default:
			warnings.push(
				`Pinned Data Table read "${nodeName}": unknown condition "${operator}" on "${keyName}"; rows were not filtered by it`,
			);
			return undefined;
	}
}

function isEmptyCell(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

// Only scalar cells take part in comparisons; an object cell never matches a filter value.
function asText(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return undefined;
}

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function asDateMs(value: unknown): number | undefined {
	if (value instanceof Date) return value.getTime();
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
	const ms = new Date(value).getTime();
	return Number.isNaN(ms) ? undefined : ms;
}

function cellEquals(cell: unknown, value: unknown): boolean {
	const cellNull = cell === null || cell === undefined;
	const valueNull = value === null || value === undefined;
	if (cellNull || valueNull) return cellNull && valueNull;
	if (typeof cell === 'boolean' || typeof value === 'boolean') {
		return asText(cell) === asText(value);
	}
	const [a, b] = [asNumber(cell), asNumber(value)];
	if (a !== undefined && b !== undefined) return a === b;
	const [dateA, dateB] = [asDateMs(cell), asDateMs(value)];
	if (dateA !== undefined && dateB !== undefined) return dateA === dateB;
	const [textA, textB] = [asText(cell), asText(value)];
	return textA !== undefined && textB !== undefined && textA === textB;
}

function compareCells(
	cell: unknown,
	value: unknown,
	operator: 'gt' | 'gte' | 'lt' | 'lte',
): boolean {
	if (isEmptyCell(cell) || value === null || value === undefined) return false;
	const [a, b] = [asNumber(cell), asNumber(value)];
	const [dateA, dateB] = [asDateMs(cell), asDateMs(value)];
	const [textA, textB] = [asText(cell), asText(value)];
	let left: number | string;
	let right: number | string;
	if (a !== undefined && b !== undefined) [left, right] = [a, b];
	else if (dateA !== undefined && dateB !== undefined) [left, right] = [dateA, dateB];
	else if (textA !== undefined && textB !== undefined) [left, right] = [textA, textB];
	else return false;
	switch (operator) {
		case 'gt':
			return left > right;
		case 'gte':
			return left >= right;
		case 'lt':
			return left < right;
		case 'lte':
			return left <= right;
	}
}

// The node wraps a value without `%` in `%…%`; only `%` is a wildcard.
function matchesLike(cell: unknown, value: unknown, caseSensitive: boolean): boolean {
	const text = asText(cell);
	if (text === undefined || text === '' || typeof value !== 'string') return false;
	const pattern = value.includes('%') ? value : `%${value}%`;
	const haystack = caseSensitive ? text : text.toLowerCase();
	const parts = (caseSensitive ? pattern : pattern.toLowerCase()).split('%');
	if (!haystack.startsWith(parts[0])) return false;
	let cursor = parts[0].length;
	for (const part of parts.slice(1, -1)) {
		const index = haystack.indexOf(part, cursor);
		if (index === -1) return false;
		cursor = index + part.length;
	}
	const tail = parts[parts.length - 1];
	return haystack.length - cursor >= tail.length && haystack.endsWith(tail);
}
