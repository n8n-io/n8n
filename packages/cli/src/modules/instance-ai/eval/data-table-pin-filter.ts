import {
	literalParameter,
	readDataTableReadParameters,
	type DataTableReadCondition,
	type DataTableReadParameters,
} from '@n8n/workflow-sdk';
import type { INode, INodeExecutionData } from 'n8n-workflow';

type Row = INodeExecutionData['json'];
type RowPredicate = (row: Row) => boolean;

export interface PinnedReadFilterResult {
	items: INodeExecutionData[];
	/** Conditions the harness could not apply, for the server log. */
	warnings: string[];
	/** The warnings the judge sees: only when the pin holds more rows than the node's limit. */
	flags: string[];
}

// A condition the harness cannot evaluate counts as a match and lifts the limit, so no row the real node might return is dropped.
export function applyDataTableReadParameters(
	node: INode,
	items: INodeExecutionData[],
): PinnedReadFilterResult {
	const read = readDataTableReadParameters(node);
	if (!read) {
		return {
			items,
			warnings: [
				`Pinned Data Table read "${node.name}": its filter parameters could not be read; rows were left as generated`,
			],
			flags: [],
		};
	}
	const { matchType, conditions, returnAll, limit, sortBy } = read;
	const warnings: string[] = [];
	const evaluators = conditions.map((condition) =>
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
	if (sortBy) kept = sortRows(kept, sortBy);
	if (!returnAll && limit !== undefined && allEvaluable) kept = kept.slice(0, limit);
	const flags =
		!allEvaluable && !returnAll && limit !== undefined && kept.length > limit ? warnings : [];
	return { items: kept, warnings, flags };
}

function conditionPredicate(
	condition: DataTableReadCondition,
	nodeName: string,
	warnings: string[],
): RowPredicate | undefined {
	const { condition: operator } = condition;
	const key = literalParameter(condition.keyName);
	const value = literalParameter(condition.keyValue);
	if (key.isExpression || value.isExpression) {
		warnings.push(
			`Pinned Data Table read "${nodeName}": the condition on "${condition.keyName}" uses an expression that cannot be evaluated before the run; rows were not filtered by it`,
		);
		return undefined;
	}
	const keyName = typeof key.literal === 'string' ? key.literal : condition.keyName;
	const keyValue = value.literal;
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

function sortRows(
	items: INodeExecutionData[],
	[column, direction]: NonNullable<DataTableReadParameters['sortBy']>,
): INodeExecutionData[] {
	const sign = direction === 'ASC' ? 1 : -1;
	return [...items].sort((a, b) => {
		if (compareCells(a.json[column], b.json[column], 'lt')) return -sign;
		if (compareCells(a.json[column], b.json[column], 'gt')) return sign;
		return 0;
	});
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
	if (text === undefined || typeof value !== 'string') return false;
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
