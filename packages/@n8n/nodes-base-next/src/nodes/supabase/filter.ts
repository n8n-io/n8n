import { arr, bool, num, oneOf, str, union, variant, type Infer } from '@n8n/node-sdk';

const column = str().with({ minLength: 1 }).hint('Column name');
export const scalar = union(str(), num(), bool());

/** One PostgREST condition. Each operator takes only the value it needs. */
export const condition = variant('op', {
	eq: { column, value: scalar },
	neq: { column, value: scalar },
	gt: { column, value: scalar },
	gte: { column, value: scalar },
	lt: { column, value: scalar },
	lte: { column, value: scalar },
	like: { column, pattern: str().hint('* matches any text, e.g. *@example.com') },
	ilike: { column, pattern: str().hint('Case-insensitive; * matches any text') },
	is: { column, value: oneOf('null', 'true', 'false', 'unknown') },
	in: { column, values: arr(scalar).with({ minItems: 1 }) },
	fullText: {
		column,
		query: str(),
		function: oneOf('fts', 'plfts', 'phfts', 'wfts')
			.default('fts')
			.hint('fts to_tsquery, plfts plain, phfts phrase, wfts websearch'),
	},
});

const conditions = arr(condition).with({ minItems: 1 });

/**
 * `all`: a row must match every condition. `any`: a row must match at least one. No default,
 * because the wrong one on a delete removes rows that it must keep.
 */
export const rowFilter = variant('match', {
	all: { conditions },
	['any']: { conditions },
}).hint('all = AND, any = OR; for "A and B" use all');

export type RowFilter = Infer<typeof rowFilter>;
type Condition = Infer<typeof condition>;

// ,.():"\ are reserved by PostgREST; &?= separate query parameters.
const RESERVED = /[,.():"&?=\\]/;

/** Mirrors `quotePostgrestComponent` in nodes-base Supabase/GenericFunctions.ts. */
export const quoted = (value: unknown) => {
	const text = String(value);
	return RESERVED.test(text) ? `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"` : text;
};

function term(entry: Condition): string {
	const name = quoted(entry.column);
	switch (entry.op) {
		case 'like':
		case 'ilike':
			return `${name}.${entry.op}.${quoted(entry.pattern)}`;
		case 'in':
			return `${name}.in.(${entry.values.map(quoted).join(',')})`;
		case 'fullText':
			return `${name}.${entry.function}.${quoted(entry.query)}`;
		default:
			return `${name}.${entry.op}.${quoted(entry.value)}`;
	}
}

/**
 * The query of a filter: `and=(…)` or `or=(…)`. One logical group keeps every condition,
 * also two conditions on one column.
 */
export const filterQuery = (filter: RowFilter | undefined) =>
	filter
		? { [filter.match === 'all' ? 'and' : 'or']: `(${filter.conditions.map(term).join(',')})` }
		: {};
