// JS-side runtime helpers for Path B residual ops.
// Pure functions — no n8n imports, no TypeORM. Operate on already-deserialized item rows.

import type { IRFilter, IROrderBy, IRSelectItem, IRScalar } from '../ir';

export type ItemRow = Record<string, unknown>;

/**
 * Walks an IRFilter tree and evaluates against a single row.
 * Returns true if the row matches (or there is no filter).
 */
export function evalFilter(filter: IRFilter | undefined, row: ItemRow): boolean {
	if (!filter) return true;
	switch (filter.kind) {
		case 'and':
			return evalFilter(filter.left, row) && evalFilter(filter.right, row);
		case 'or':
			return evalFilter(filter.left, row) || evalFilter(filter.right, row);
		case 'not':
			return !evalFilter(filter.arg, row);
		case 'compare':
			return compare(row[filter.field], filter.op, filter.value);
		case 'in':
			return filter.values.some((v) => looseEq(row[filter.field], v));
		case 'like':
			return likeMatch(row[filter.field], filter.pattern);
		case 'isNull':
			return row[filter.field] === null || row[filter.field] === undefined;
		case 'isNotNull':
			return row[filter.field] !== null && row[filter.field] !== undefined;
	}
}

/**
 * Projects a row according to the SELECT list.
 * - `{kind: 'star'}` → pass through every key
 * - `{kind: 'column'}` → keep only that key (undefined → null)
 * - aggregates are not handled here (Path B aggregates aren't in this slice)
 */
export function projectRow(row: ItemRow, projection: IRSelectItem[]): ItemRow {
	if (projection.some((p) => p.kind === 'star')) return row;
	const out: ItemRow = {};
	for (const item of projection) {
		if (item.kind === 'column') {
			out[item.name] = row[item.name] ?? null;
		} else if (item.kind === 'aggregate') {
			// Path B aggregates not supported in this slice — skip.
		}
	}
	return out;
}

/**
 * Builds the ordered column list for a set of rows.
 * For star projection: union of keys across all rows (meta cols first).
 * For explicit: the column names in user order.
 */
export function deriveColumns(projection: IRSelectItem[], rows: ItemRow[]): string[] {
	if (projection.some((p) => p.kind === 'star')) {
		const keys = new Set<string>();
		keys.add('_execution_id');
		keys.add('_executed_at');
		for (const row of rows) {
			for (const k of Object.keys(row)) keys.add(k);
		}
		return Array.from(keys);
	}
	return projection
		.filter((p): p is Extract<IRSelectItem, { kind: 'column' }> => p.kind === 'column')
		.map((p) => p.name);
}

/**
 * Sorts rows in place according to ORDER BY clauses.
 * Aggregate ORDER BY items are skipped (not supported in this Path B slice).
 */
export function applyOrderBy(rows: ItemRow[], orderBy: IROrderBy[] | undefined): void {
	if (!orderBy?.length) return;
	rows.sort((a, b) => {
		for (const o of orderBy) {
			if (o.kind === 'aggregate') continue;
			const av = a[o.field];
			const bv = b[o.field];
			const cmp = looseCompare(av, bv);
			if (cmp !== 0) return o.direction === 'desc' ? -cmp : cmp;
		}
		return 0;
	});
}

function compare(left: unknown, op: string, right: IRScalar): boolean {
	switch (op) {
		case '=':
			return looseEq(left, right);
		case '!=':
		case '<>':
			return !looseEq(left, right);
		case '<':
			return looseCompare(left, right) < 0;
		case '>':
			return looseCompare(left, right) > 0;
		case '<=':
			return looseCompare(left, right) <= 0;
		case '>=':
			return looseCompare(left, right) >= 0;
	}
	return false;
}

function looseEq(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (a == null || b == null) return false;
	// Coerce numbers ↔ numeric strings for SQL-ish equality.
	if (typeof a === 'number' && typeof b === 'string') return a === Number(b);
	if (typeof a === 'string' && typeof b === 'number') return Number(a) === b;
	return false;
}

function looseCompare(a: unknown, b: unknown): number {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	const as = String(a);
	const bs = String(b);
	return as < bs ? -1 : as > bs ? 1 : 0;
}

function likeMatch(value: unknown, pattern: string): boolean {
	if (typeof value !== 'string') return false;
	const regex = new RegExp(
		'^' +
			pattern
				.split('')
				.map((c) => {
					if (c === '%') return '.*';
					if (c === '_') return '.';
					return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				})
				.join('') +
			'$',
	);
	return regex.test(value);
}
