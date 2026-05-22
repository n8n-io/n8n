import type { IRFilter, IROrderBy, IRQuery, IRSelectItem } from '../ir';
import type { SchemaMap } from '../schema-map';
import { compileForExecutions } from './executions';
import { compileForNodeOutput } from './node-output';
import { compileForWorkflows } from './workflows';

export type SqlOnlyStrategy = {
	kind: 'sql-only';
	sql: string;
	params: unknown[];
	columns: string[];
	limit: number;
};

export type ResidualOps = {
	nodeName: string;
	projection: IRSelectItem[];
	filter?: IRFilter;
	orderBy?: IROrderBy[];
};

export type SqlPlusJsStrategy = {
	kind: 'sql+js';
	fetch: { sql: string; params: unknown[] };
	residual: ResidualOps;
	limit: number;
};

export type ExecutionStrategy = SqlOnlyStrategy | SqlPlusJsStrategy;

export function compile(ir: IRQuery, schema: SchemaMap): ExecutionStrategy {
	switch (ir.source.kind) {
		case 'executions':
			return compileForExecutions(ir, schema);
		case 'workflows':
			return compileForWorkflows(ir, schema);
		case 'nodeOutput':
			return compileForNodeOutput(ir, schema);
	}
}
