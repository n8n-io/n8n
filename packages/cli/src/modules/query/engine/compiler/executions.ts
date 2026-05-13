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

const ALL_EXECUTIONS_COLUMNS = [
	'id',
	'workflowId',
	'workflowName',
	'status',
	'mode',
	'startedAt',
	'stoppedAt',
	'duration_ms',
	'retryOf',
] as const;

const columnExpr: ColumnExpr = (name, dialect) => {
	switch (name) {
		case 'id':
			return 'e."id"';
		case 'workflowId':
			return 'e."workflowId"';
		case 'workflowName':
			return 'w."name"';
		case 'status':
			return 'e."status"';
		case 'mode':
			return 'e."mode"';
		case 'startedAt':
			return 'e."startedAt"';
		case 'stoppedAt':
			return 'e."stoppedAt"';
		case 'retryOf':
			return 'e."retryOf"';
		case 'duration_ms':
			return dialect === 'postgresdb'
				? 'EXTRACT(EPOCH FROM (e."stoppedAt" - e."startedAt")) * 1000'
				: '(julianday(e."stoppedAt") - julianday(e."startedAt")) * 86400000';
	}
	throw new Error(`Unknown executions column: ${name}`);
};

export function compileForExecutions(ir: IRQuery, schema: SchemaMap): ExecutionStrategy {
	const params = new ParamList(schema.dialect);
	const dialect: Dialect = schema.dialect;
	const { tablePrefix } = schema;

	const { sql: selectSql, columns } = buildSelect(
		ir.select,
		dialect,
		columnExpr,
		ALL_EXECUTIONS_COLUMNS,
	);

	const executionTable = quoteIdentifier(`${tablePrefix}execution_entity`);
	const workflowTable = quoteIdentifier(`${tablePrefix}workflow_entity`);

	const permissionClause =
		schema.accessibleWorkflowIds.length === 0
			? '1=0'
			: `e."workflowId" IN ${params.addList(schema.accessibleWorkflowIds)}`;
	const userClause = ir.filter ? buildFilter(ir.filter, params, dialect, columnExpr) : null;
	const whereClause = userClause ? `${permissionClause} AND ${userClause}` : permissionClause;

	const groupByClause = ir.groupBy
		? ir.groupBy.map((c) => columnExpr(c, dialect)).join(', ')
		: null;

	const havingClause = ir.having ? buildHaving(ir.having, params, dialect, columnExpr) : null;
	const orderByClause = ir.orderBy ? buildOrderBy(ir.orderBy, dialect, columnExpr) : null;

	const limit = ir.limit ?? DEFAULT_LIMIT;

	const lines = [
		`SELECT ${selectSql}`,
		`FROM ${executionTable} AS e`,
		`LEFT JOIN ${workflowTable} AS w ON w."id" = e."workflowId"`,
		`WHERE ${whereClause}`,
	];
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
