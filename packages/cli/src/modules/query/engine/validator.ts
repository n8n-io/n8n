import type {
	ColumnRef,
	Expr,
	OrderByItem,
	ScalarExpr,
	SelectColumn,
	SelectStmt,
	Source,
	WindowClause,
} from './ast';
import { ValidationError } from './errors';
import type {
	IRAggregateFn,
	IRFilter,
	IRHavingFilter,
	IRHavingLHS,
	IROrderBy,
	IRQuery,
	IRSelectItem,
	IRSource,
	IRWindow,
} from './ir';
import type { SchemaMap } from './schema-map';

const EXECUTIONS_COLUMNS = new Set([
	'id',
	'workflowId',
	'workflowName',
	'status',
	'mode',
	'startedAt',
	'stoppedAt',
	'duration_ms',
	'retryOf',
]);

const WORKFLOWS_COLUMNS = new Set(['id', 'name', 'active', 'createdAt', 'updatedAt']);

type ColumnCheck = (name: string, position: number) => void;

export function validate(stmt: SelectStmt, schema: SchemaMap): IRQuery {
	if (schema.dialect !== 'postgresdb' && schema.dialect !== 'sqlite') {
		throw new ValidationError(
			'DB_UNSUPPORTED',
			`Unsupported database dialect: ${String(schema.dialect)}`,
		);
	}

	const source = validateSource(stmt.from.source, schema);
	const checkCol = makeColumnCheck(source);

	const select = validateSelect(stmt.columns, checkCol);
	const window = validateWindow(stmt.from.window, source);
	const filter = stmt.where ? validateFilter(stmt.where, checkCol) : undefined;
	const groupBy = stmt.groupBy ? validateGroupBy(stmt.groupBy, checkCol) : undefined;
	const having = stmt.having ? validateHaving(stmt.having, checkCol) : undefined;
	const orderBy = stmt.orderBy ? validateOrderBy(stmt.orderBy, checkCol) : undefined;

	const ir: IRQuery = { source, select };
	if (filter) ir.filter = filter;
	if (groupBy) ir.groupBy = groupBy;
	if (having) ir.having = having;
	if (orderBy) ir.orderBy = orderBy;
	if (stmt.limit !== undefined) ir.limit = stmt.limit;
	if (window) ir.window = window;
	return ir;
}

function validateSource(astSource: Source, schema: SchemaMap): IRSource {
	if (astSource.kind === 'systemTable') {
		if (astSource.name === 'executions') return { kind: 'executions' };
		if (astSource.name === 'workflows') return { kind: 'workflows' };
		throw new ValidationError(
			'UNKNOWN_SOURCE',
			`Unknown source '${astSource.name}'`,
			astSource.position,
		);
	}

	const workflowId = schema.resolveWorkflowId(astSource.workflow);
	if (workflowId === null) {
		throw new ValidationError(
			'UNKNOWN_WORKFLOW',
			`Unknown workflow '${astSource.workflow}'`,
			astSource.position,
		);
	}
	if (!schema.hasReadAccess(workflowId)) {
		throw new ValidationError(
			'FORBIDDEN_WORKFLOW',
			`No read access to workflow '${astSource.workflow}'`,
			astSource.position,
		);
	}
	return { kind: 'nodeOutput', workflowId, nodeName: astSource.node };
}

function makeColumnCheck(source: IRSource): ColumnCheck {
	if (source.kind === 'executions') {
		return (name, position) => {
			if (!EXECUTIONS_COLUMNS.has(name)) {
				throw new ValidationError(
					'UNKNOWN_FIELD',
					`Unknown column '${name}' on executions`,
					position,
				);
			}
		};
	}
	if (source.kind === 'workflows') {
		return (name, position) => {
			if (!WORKFLOWS_COLUMNS.has(name)) {
				throw new ValidationError(
					'UNKNOWN_FIELD',
					`Unknown column '${name}' on workflows`,
					position,
				);
			}
		};
	}
	// nodeOutput — no whitelist
	return () => {};
}

function validateSelect(columns: SelectColumn[], checkCol: ColumnCheck): IRSelectItem[] {
	const used = new Set<string>();
	return columns.map((col): IRSelectItem => {
		if (col.kind === 'star') return { kind: 'star' };
		if (col.kind === 'column') {
			checkCol(col.ref.name, col.ref.position);
			return { kind: 'column', name: col.ref.name };
		}
		const arg = checkAggregateArg(col, checkCol);
		const as = generateAggregateAlias(col.fn, arg, used);
		return { kind: 'aggregate', fn: col.fn, arg, as };
	});
}

function checkAggregateArg(
	agg: { arg: ColumnRef | 'star' },
	checkCol: ColumnCheck,
): 'star' | string {
	if (agg.arg === 'star') return 'star';
	checkCol(agg.arg.name, agg.arg.position);
	return agg.arg.name;
}

function generateAggregateAlias(
	fn: IRAggregateFn,
	arg: 'star' | string,
	used: Set<string>,
): string {
	const base = arg === 'star' ? fn : `${fn}_${arg}`;
	if (!used.has(base)) {
		used.add(base);
		return base;
	}
	let n = 2;
	while (used.has(`${base}_${n}`)) n++;
	const result = `${base}_${n}`;
	used.add(result);
	return result;
}

function validateWindow(window: WindowClause | undefined, source: IRSource): IRWindow | undefined {
	if (!window) return undefined;
	if (source.kind !== 'nodeOutput') {
		throw new ValidationError(
			'INVALID_WINDOW',
			'Windows (LAST / SINCE / EXECUTION) are only valid on node-output sources',
		);
	}
	return window;
}

function validateGroupBy(refs: ColumnRef[], checkCol: ColumnCheck): string[] {
	return refs.map((ref) => {
		checkCol(ref.name, ref.position);
		return ref.name;
	});
}

function validateFilter(expr: Expr, checkCol: ColumnCheck): IRFilter {
	switch (expr.kind) {
		case 'and':
		case 'or':
			return {
				kind: expr.kind,
				left: validateFilter(expr.left, checkCol),
				right: validateFilter(expr.right, checkCol),
			};
		case 'not':
			return { kind: 'not', arg: validateFilter(expr.arg, checkCol) };
		case 'compare':
			if (expr.left.kind === 'aggregate') {
				throw new ValidationError(
					'AGGREGATE_IN_WHERE',
					'Aggregate functions are not allowed in WHERE — use HAVING instead',
				);
			}
			checkCol(expr.left.ref.name, expr.left.ref.position);
			return {
				kind: 'compare',
				op: expr.op,
				field: expr.left.ref.name,
				value: expr.right.value,
			};
		case 'in':
			checkCol(expr.left.name, expr.left.position);
			return {
				kind: 'in',
				field: expr.left.name,
				values: expr.values.map((v) => v.value),
			};
		case 'like':
			checkCol(expr.left.name, expr.left.position);
			return { kind: 'like', field: expr.left.name, pattern: expr.pattern };
		case 'isNull':
		case 'isNotNull':
			checkCol(expr.arg.name, expr.arg.position);
			return { kind: expr.kind, field: expr.arg.name };
	}
}

function validateHaving(expr: Expr, checkCol: ColumnCheck): IRHavingFilter {
	switch (expr.kind) {
		case 'and':
		case 'or':
			return {
				kind: expr.kind,
				left: validateHaving(expr.left, checkCol),
				right: validateHaving(expr.right, checkCol),
			};
		case 'not':
			return { kind: 'not', arg: validateHaving(expr.arg, checkCol) };
		case 'compare': {
			const lhs: IRHavingLHS =
				expr.left.kind === 'aggregate'
					? aggregateLhs(expr.left, checkCol)
					: columnLhs(expr.left, checkCol);
			return { kind: 'compare', op: expr.op, lhs, value: expr.right.value };
		}
		case 'in':
			checkCol(expr.left.name, expr.left.position);
			return {
				kind: 'in',
				field: expr.left.name,
				values: expr.values.map((v) => v.value),
			};
		case 'like':
			checkCol(expr.left.name, expr.left.position);
			return { kind: 'like', field: expr.left.name, pattern: expr.pattern };
		case 'isNull':
		case 'isNotNull':
			checkCol(expr.arg.name, expr.arg.position);
			return { kind: expr.kind, field: expr.arg.name };
	}
}

function aggregateLhs(
	agg: Extract<ScalarExpr, { kind: 'aggregate' }>,
	checkCol: ColumnCheck,
): IRHavingLHS {
	const arg = checkAggregateArg(agg, checkCol);
	return { kind: 'aggregate', fn: agg.fn, arg };
}

function columnLhs(
	col: Extract<ScalarExpr, { kind: 'column' }>,
	checkCol: ColumnCheck,
): IRHavingLHS {
	checkCol(col.ref.name, col.ref.position);
	return { kind: 'column', field: col.ref.name };
}

function validateOrderBy(items: OrderByItem[], checkCol: ColumnCheck): IROrderBy[] {
	return items.map((item): IROrderBy => {
		if (item.expr.kind === 'column') {
			checkCol(item.expr.ref.name, item.expr.ref.position);
			return { kind: 'column', field: item.expr.ref.name, direction: item.direction };
		}
		const arg = checkAggregateArg(item.expr, checkCol);
		return { kind: 'aggregate', fn: item.expr.fn, arg, direction: item.direction };
	});
}
