import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class RefactorExecutionIndices1717498465932 implements ReversibleMigration {
	transaction = false as const;

	async up({ schemaBuilder, isPostgres, isSqlite }: MigrationContext) {
		await schemaBuilder.dropIndex(
			'execution_entity',
			['waitTill', 'id'], // covered by `waitTill, status` - `id` is unused
			isPostgres ? 'IDX_85b981df7b444f905f8bf50747' : 'IDX_b94b45ce2c73ce46c54f20b5f9',
		);

		if (isSqlite) {
			await schemaBuilder.dropIndex(
				'execution_entity',
				['stoppedAt'],
				'idx_execution_entity_stopped_at', // duplicate of `IDX_execution_entity_stoppedAt`
			);
		}

		await schemaBuilder.createIndex(
			'execution_entity',
			['status', 'startedAt'], // for default query at `GET /executions`
		);

		await schemaBuilder.createIndex(
			'execution_entity',
			['workflowId', 'status', 'startedAt'], // for query with filters at `GET /executions`
		);

		await schemaBuilder.createIndex(
			'execution_entity',
			['waitTill', 'status'], // for waiting executions queries on interval
		);
	}

	async down({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropIndex('execution_entity', ['status', 'startedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['workflowId', 'status', 'startedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['waitTill', 'status']);

		await schemaBuilder.createIndex('execution_entity', ['waitTill', 'id']);
	}
}
