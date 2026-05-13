import type { IRQuery } from '../ir';
import type { SchemaMap } from '../schema-map';
import {
	buildFilter,
	buildHaving,
	buildOrderBy,
	buildSelect,
	ParamList,
	quoteIdentifier,
	type ColumnExpr,
	type Dialect,
} from './helpers';
import type { ExecutionStrategy } from './index';

const DEFAULT_LIMIT = 1000;

const ALL_WORKFLOWS_COLUMNS = ['id', 'name', 'active', 'createdAt', 'updatedAt'] as const;

const columnExpr: ColumnExpr = (name) => {
	switch (name) {
		case 'id':
			return 'w."id"';
		case 'name':
			return 'w."name"';
		case 'active':
			return 'w."active"';
		case 'createdAt':
			return 'w."createdAt"';
		case 'updatedAt':
			return 'w."updatedAt"';
	}
	throw new Error(`Unknown workflows column: ${name}`);
};

export function compileForWorkflows(ir: IRQuery, schema: SchemaMap): ExecutionStrategy {
	const params = new ParamList(schema.dialect);
	const dialect: Dialect = schema.dialect;
	const { tablePrefix } = schema;

	const { sql: selectSql, columns } = buildSelect(
		ir.select,
		dialect,
		columnExpr,
		ALL_WORKFLOWS_COLUMNS,
	);

	const workflowTable = quoteIdentifier(`${tablePrefix}workflow_entity`);

	const permissionClause =
		schema.accessibleWorkflowIds.length === 0
			? '1=0'
			: `w."id" IN ${params.addList(schema.accessibleWorkflowIds)}`;
	const userClause = ir.filter ? buildFilter(ir.filter, params, dialect, columnExpr) : null;
	const whereClause = userClause ? `${permissionClause} AND ${userClause}` : permissionClause;

	const groupByClause = ir.groupBy
		? ir.groupBy.map((c) => columnExpr(c, dialect)).join(', ')
		: null;

	const havingClause = ir.having ? buildHaving(ir.having, params, dialect, columnExpr) : null;
	const orderByClause = ir.orderBy ? buildOrderBy(ir.orderBy, dialect, columnExpr) : null;

	const limit = ir.limit ?? DEFAULT_LIMIT;

	const lines = [`SELECT ${selectSql}`, `FROM ${workflowTable} AS w`, `WHERE ${whereClause}`];
	if (groupByClause) lines.push(`GROUP BY ${groupByClause}`);
	if (havingClause) lines.push(`HAVING ${havingClause}`);
	if (orderByClause) lines.push(`ORDER BY ${orderByClause}`);
	lines.push(`LIMIT ${limit}`);

	return {
		kind: 'sql-only',
		sql: lines.join('\n'),
		params: params.values(),
		columns,
		limit,
	};
}
