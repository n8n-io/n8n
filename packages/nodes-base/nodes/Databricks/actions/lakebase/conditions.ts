import type { IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

export type LakebaseWhereRule = { column?: string; condition?: string; value?: unknown };
export type LakebaseSortRule = { column?: string; direction?: string };

export type LakebaseQueryInput = {
	where: LakebaseWhereRule[];
	combineConditions: 'AND' | 'OR';
	sort: LakebaseSortRule[];
	outputColumns: string[];
};

/** Conditions the Data API accepts. The operator is written into the query string unquoted, so this list is the guard. */
const LAKEBASE_OPERATORS = new Set([
	'eq',
	'neq',
	'gt',
	'gte',
	'lt',
	'lte',
	'like',
	'ilike',
	'is.null',
	'not.is.null',
]);

const LAKEBASE_SORT_DIRECTIONS = new Set(['asc', 'desc']);

/** Operators that are a complete condition on their own, with no value to compare against */
const VALUELESS_OPERATORS = new Set(['is.null', 'not.is.null']);

const POSTGREST_RESERVED_CHARACTERS = /[,.():"&?=\\]/;

/**
 * Quotes a value that goes inside an `and=()` or `or=()` group, where a comma or a
 * bracket would otherwise end the term.
 */
export function quotePostgrestComponent(value: unknown): string {
	const stringValue = String(value);
	if (!POSTGREST_RESERVED_CHARACTERS.test(stringValue)) return stringValue;

	return `"${stringValue.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

/**
 * Turns the Select Rows, Sort and Output Columns fields into Data API query parameters.
 *
 * Conditions always go into a single `and=()` or `or=()` group rather than one
 * parameter per column, so two conditions on the same column both survive.
 */
export function buildLakebaseQuery(input: LakebaseQueryInput): IDataObject {
	const qs: IDataObject = {};

	const terms = input.where
		.filter((rule) => rule.column)
		.map((rule) => {
			const condition = String(rule.condition ?? '');
			if (!LAKEBASE_OPERATORS.has(condition)) {
				throw new UserError(`Unsupported filter condition: "${condition}"`);
			}

			const column = quotePostgrestComponent(rule.column);
			return VALUELESS_OPERATORS.has(condition)
				? `${column}.${condition}`
				: `${column}.${condition}.${quotePostgrestComponent(rule.value ?? '')}`;
		});

	if (terms.length > 0) {
		qs[input.combineConditions === 'OR' ? 'or' : 'and'] = `(${terms.join(',')})`;
	}

	const order = input.sort
		.filter((rule) => rule.column)
		.map((rule) => {
			const direction = rule.direction ?? 'asc';
			if (!LAKEBASE_SORT_DIRECTIONS.has(direction)) {
				throw new UserError(`Unsupported sort direction: "${direction}"`);
			}

			return `${quotePostgrestComponent(rule.column)}.${direction}`;
		});
	if (order.length > 0) qs.order = order.join(',');

	if (input.outputColumns.length > 0 && !input.outputColumns.includes('*')) {
		qs.select = input.outputColumns.map(quotePostgrestComponent).join(',');
	}

	return qs;
}
