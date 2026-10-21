import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAgentExecutionUsageAndLinks1792665706795 implements ReversibleMigration {
	async up({
		schemaBuilder: { addColumns, addForeignKey, column, createIndex },
	}: MigrationContext) {
		await addColumns(
			'agent_execution',
			[
				column('cacheReadTokens').int.comment(
					'Input tokens read from the provider prompt cache. A subset of promptTokens, not added to it',
				),
				column('cacheWriteTokens').int.comment(
					'Input tokens written to the provider prompt cache. A subset of promptTokens, not added to it',
				),
				column('parentExecutionId')
					.varchar(36)
					.comment(
						'Execution of the parent turn that delegated this run. Null for a top-level turn',
					),
			],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(
			'agent_execution',
			'parentExecutionId',
			['agent_execution', 'id'],
			'FK_agent_execution_parentExecutionId',
			'SET NULL',
		);
		await createIndex('agent_execution', ['parentExecutionId']);
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('agent_execution', ['parentExecutionId']);
		await dropColumns(
			'agent_execution',
			['parentExecutionId', 'cacheReadTokens', 'cacheWriteTokens'],
			{ recreatesOnSqlite: true },
		);
	}
}
