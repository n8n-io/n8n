import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import type { SelectStmt } from './engine/ast';
import { compile } from './engine/compiler';
import { lex } from './engine/lexer';
import { parse } from './engine/parser';
import { validate } from './engine/validator';
import { QueryExecutor, type RunQueryResult } from './query.executor';
import { SchemaMapBuilder } from './schema-map.builder';

export type RunQueryOptions = {
	timeoutMs?: number;
};

@Service()
export class QueryService {
	constructor(
		private readonly schemaMapBuilder: SchemaMapBuilder,
		private readonly executor: QueryExecutor,
	) {}

	async run(sql: string, user: User, opts: RunQueryOptions = {}): Promise<RunQueryResult> {
		const stmt = parse(lex(sql));
		const workflowNames = extractWorkflowNames(stmt);
		const schema = await this.schemaMapBuilder.forUser(user, workflowNames);
		const ir = validate(stmt, schema);
		const strategy = compile(ir, schema);
		return await this.executor.execute(strategy, { timeoutMs: opts.timeoutMs });
	}
}

function extractWorkflowNames(stmt: SelectStmt): string[] {
	if (stmt.from.source.kind === 'nodeOutput') {
		return [stmt.from.source.workflow];
	}
	return [];
}
