import type { IRQuery } from '../ir';
import type { SchemaMap } from '../schema-map';
import { compileForExecutions } from './executions';
import { compileForWorkflows } from './workflows';

export type ExecutionStrategy = {
	kind: 'sql-only';
	sql: string;
	params: unknown[];
	columns: string[];
	limit: number;
};

export function compile(ir: IRQuery, schema: SchemaMap): ExecutionStrategy {
	switch (ir.source.kind) {
		case 'executions':
			return compileForExecutions(ir, schema);
		case 'workflows':
			return compileForWorkflows(ir, schema);
		case 'nodeOutput':
			// Path B (node-output streaming) is post-v1 — see plan §6.2 T1.3.
			throw new Error('Node-output queries are not yet supported');
	}
}
