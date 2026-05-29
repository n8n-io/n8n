import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSubAgentOriginToAgentExecutionThreads1784000000018 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('agent_execution_threads', [
			column('origin')
				.varchar(16)
				.notNull.default("'direct'")
				.withEnumCheck(['direct', 'subagent'])
				.comment('How this agent session was started.'),
			column('parentThreadId')
				.varchar(128)
				.comment('Parent session thread id that delegated this subagent run.'),
			column('parentAgentId')
				.varchar(36)
				.comment('Saved agent id of the parent that delegated this subagent run.'),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agent_execution_threads', ['origin', 'parentThreadId', 'parentAgentId']);
	}
}
