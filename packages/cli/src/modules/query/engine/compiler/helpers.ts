import type { IRAggregateFn, IRFilter, IRHavingFilter, IROrderBy, IRSelectItem } from '../ir';

export type Dialect = 'postgresdb' | 'sqlite';

export type ColumnExpr = (name: string, dialect: Dialect) => string;

// Builds parameterized SQL fragments while tracking placeholders per dialect.
export class ParamList {
	private readonly params: unknown[] = [];

	constructor(private readonly dialect: Dialect) {}

	add(value: unknown): string {
		this.params.push(value);
		return this.dialect === 'postgresdb' ? `$${this.params.length}` : '?';
	}

	addList(values: readonly unknown[]): string {
		if (values.length === 0) {
			throw new Error('addList called with empty array — caller must handle this case');
		}
		return '(' + values.map((v) => this.add(v)).join(', ') + ')';
	}

	values(): unknown[] {
		return [...this.params];
	}
}

export function quoteIdentifier(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

export function aggregateExpr(
	fn: IRAggregateFn,
	arg: 'star' | string,
	dialect: Dialect,
	columnExpr: ColumnExpr,
): string {
	const argSql = arg === 'star' ? '*' : columnExpr(arg, dialect);
	return `${fn.toUpperCase()}(${argSql})`;
}

export function buildSelect(
	items: IRSelectItem[],
	dialect: Dialect,
	columnExpr: ColumnExpr,
	allColumns: readonly string[],
): { sql: string; columns: string[] } {
	const columns: string[] = [];
	const parts: string[] = [];

	for (const item of items) {
		if (item.kind === 'star') {
			for (const col of allColumns) {
				parts.push(`${columnExpr(col, dialect)} AS "${col}"`);
				columns.push(col);
			}
		} else if (item.kind === 'column') {
			parts.push(`${columnExpr(item.name, dialect)} AS "${item.name}"`);
			columns.push(item.name);
		} else {
			parts.push(`${aggregateExpr(item.fn, item.arg, dialect, columnExpr)} AS "${item.as}"`);
			columns.push(item.as);
		}
	}

	return { sql: parts.join(', '), columns };
}

export function buildFilter(
	filter: IRFilter,
	params: ParamList,
	dialect: Dialect,
	columnExpr: ColumnExpr,
): string {
	switch (filter.kind) {
		case 'and':
			return `(${buildFilter(filter.left, params, dialect, columnExpr)} AND ${buildFilter(filter.right, params, dialect, columnExpr)})`;
		case 'or':
			return `(${buildFilter(filter.left, params, dialect, columnExpr)} OR ${buildFilter(filter.right, params, dialect, columnExpr)})`;
		case 'not':
			return `NOT (${buildFilter(filter.arg, params, dialect, columnExpr)})`;
		case 'compare':
			return `${columnExpr(filter.field, dialect)} ${filter.op} ${params.add(filter.value)}`;
		case 'in':
			return `${columnExpr(filter.field, dialect)} IN ${params.addList(filter.values)}`;
		case 'like':
			return `${columnExpr(filter.field, dialect)} LIKE ${params.add(filter.pattern)}`;
		case 'isNull':
			return `${columnExpr(filter.field, dialect)} IS NULL`;
		case 'isNotNull':
			return `${columnExpr(filter.field, dialect)} IS NOT NULL`;
	}
}

export function buildHaving(
	filter: IRHavingFilter,
	params: ParamList,
	dialect: Dialect,
	columnExpr: ColumnExpr,
): string {
	switch (filter.kind) {
		case 'and':
			return `(${buildHaving(filter.left, params, dialect, columnExpr)} AND ${buildHaving(filter.right, params, dialect, columnExpr)})`;
		case 'or':
			return `(${buildHaving(filter.left, params, dialect, columnExpr)} OR ${buildHaving(filter.right, params, dialect, columnExpr)})`;
		case 'not':
			return `NOT (${buildHaving(filter.arg, params, dialect, columnExpr)})`;
		case 'compare': {
			const lhsSql =
				filter.lhs.kind === 'column'
					? columnExpr(filter.lhs.field, dialect)
					: aggregateExpr(filter.lhs.fn, filter.lhs.arg, dialect, columnExpr);
			return `${lhsSql} ${filter.op} ${params.add(filter.value)}`;
		}
		case 'in':
			return `${columnExpr(filter.field, dialect)} IN ${params.addList(filter.values)}`;
		case 'like':
			return `${columnExpr(filter.field, dialect)} LIKE ${params.add(filter.pattern)}`;
		case 'isNull':
			return `${columnExpr(filter.field, dialect)} IS NULL`;
		case 'isNotNull':
			return `${columnExpr(filter.field, dialect)} IS NOT NULL`;
	}
}

export function buildOrderBy(items: IROrderBy[], dialect: Dialect, columnExpr: ColumnExpr): string {
	return items
		.map((item) => {
			const expr =
				item.kind === 'column'
					? columnExpr(item.field, dialect)
					: aggregateExpr(item.fn, item.arg, dialect, columnExpr);
			return `${expr} ${item.direction.toUpperCase()}`;
		})
		.join(', ');
}
