import type { IRQuery, IRWindow } from '../ir';
import type { SchemaMap } from '../schema-map';
import { ParamList, quoteIdentifier, type Dialect } from './helpers';
import type { ExecutionStrategy } from './index';

const DEFAULT_LIMIT = 1000;

/**
 * Compiles a `nodeOutput` IR into a `sql+js` strategy.
 *
 * - SQL phase fetches the matching executions (workflowId + permission scope +
 *   window predicate) and returns their flatted `data` blobs alongside meta
 *   columns.
 * - JS phase (in the executor) parses each blob, navigates to the node's
 *   output items, injects `_execution_id` / `_executed_at`, applies the
 *   residual WHERE / projection / ORDER BY, and caps at the user's LIMIT.
 *
 * Default window is `LAST 10` when none is specified.
 */
export function compileForNodeOutput(ir: IRQuery, schema: SchemaMap): ExecutionStrategy {
	if (ir.source.kind !== 'nodeOutput') {
		throw new Error('compileForNodeOutput called with non-nodeOutput source');
	}

	const params = new ParamList(schema.dialect);
	const dialect: Dialect = schema.dialect;
	const { tablePrefix } = schema;

	const executionTable = quoteIdentifier(`${tablePrefix}execution_entity`);
	const executionDataTable = quoteIdentifier(`${tablePrefix}execution_data`);

	const window: IRWindow = ir.window ?? { kind: 'last', n: 10 };

	const workflowIdParam = params.add(ir.source.workflowId);
	const permissionClause =
		schema.accessibleWorkflowIds.length === 0
			? '1=0'
			: `e."workflowId" IN ${params.addList(schema.accessibleWorkflowIds)}`;

	const lines: string[] = [
		'SELECT e."id" AS "_execution_id",',
		'       e."startedAt" AS "_executed_at",',
		'       ed."data" AS "_raw"',
		`FROM ${executionTable} AS e`,
		`JOIN ${executionDataTable} AS ed ON ed."executionId" = e."id"`,
		`WHERE e."workflowId" = ${workflowIdParam}`,
		`  AND ${permissionClause}`,
	];

	switch (window.kind) {
		case 'last':
			lines.push(`  AND e."status" = 'success'`);
			lines.push('ORDER BY e."startedAt" DESC');
			lines.push(`LIMIT ${window.n}`);
			break;
		case 'since':
			lines.push(`  AND e."startedAt" > ${params.add(window.iso)}`);
			lines.push('ORDER BY e."startedAt" DESC');
			break;
		case 'execution':
			lines.push(`  AND e."id" = ${params.add(window.id)}`);
			break;
	}

	const limit = ir.limit ?? DEFAULT_LIMIT;

	if (dialect === 'sqlite') {
		// noop — sqlite uses ? placeholders already produced by ParamList
	}

	return {
		kind: 'sql+js',
		fetch: {
			sql: lines.join('\n'),
			params: params.values(),
		},
		residual: {
			nodeName: ir.source.nodeName,
			projection: ir.select,
			filter: ir.filter,
			orderBy: ir.orderBy,
		},
		limit,
	};
}
