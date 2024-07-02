import type { MigrationContext, ReversibleMigration } from '@/databases/types';

/**
 * Add new indices:
 *
 * - `status, startedAt` for default query at `ExecutionRepository.findManyByRangeQuery`
 * - `workflowId, status, startedAt` for filtered query at `ExecutionRepository.findManyByRangeQuery`
 * - `waitTill, status` for regular queries at `ExecutionRepository.getWaitingExecutions`
 *
 * Remove unused indices in sqlite:
 *
 * - `stoppedAt` (duplicate with different casing)
 * - `waitTill`
 * - `status, workflowId`
 *
 * Remove unused indices in MySql:
 *
 * - `status`
 *
 * Remove unused indices in all DBs:
 *
 * - `stopped_at`
 * - `waitTill, id`
 * - `workflowId, id`
 *
 * Keep index as is:
 *
 * - `deletedAt` for query at `ExecutionRepository.hardDeleteSoftDeletedExecutions`
 */
export class RefactorExecutionIndices1717498465932 implements ReversibleMigration {
	async up({ schemaBuilder, isPostgres, isSqlite, isMysql }: MigrationContext) {
		await schemaBuilder.createIndex('execution_entity', ['status', 'startedAt']);
		await schemaBuilder.createIndex('execution_entity', ['workflowId', 'status', 'startedAt']);
		await schemaBuilder.createIndex('execution_entity', ['waitTill', 'status']);

		if (isSqlite) {
			await schemaBuilder.dropIndex('execution_entity', ['stoppedAt'], {
				customIndexName: 'idx_execution_entity_stopped_at',
				skipIfMissing: true,
			});

			await schemaBuilder.dropIndex('execution_entity', ['waitTill'], {
				customIndexName: 'idx_execution_entity_wait_till',
				skipIfMissing: true,
			});

			await schemaBuilder.dropIndex('execution_entity', ['status', 'workflowId'], {
				customIndexName: 'IDX_8b6f3f9ae234f137d707b98f3bf43584',
				skipIfMissing: true,
			});
		}

		if (isMysql) {
			await schemaBuilder.dropIndex('execution_entity', ['status'], {
				customIndexName: 'IDX_8b6f3f9ae234f137d707b98f3bf43584',
				skipIfMissing: true,
			});
		}

		// all DBs

		await schemaBuilder.dropIndex('execution_entity', ['stoppedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['waitTill', 'id'], {
			customIndexName: isPostgres
				? 'IDX_85b981df7b444f905f8bf50747'
				: 'IDX_b94b45ce2c73ce46c54f20b5f9',
			skipIfMissing: true,
		});
		await schemaBuilder.dropIndex('execution_entity', ['workflowId', 'id'], {
			customIndexName:
				isPostgres || isMysql
					? 'idx_execution_entity_workflow_id_id'
					: 'IDX_81fc04c8a17de15835713505e4',
			skipIfMissing: true,
		});
	}

	async down({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropIndex('execution_entity', ['status', 'startedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['workflowId', 'status', 'startedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['waitTill', 'status']);

		await schemaBuilder.createIndex('execution_entity', ['waitTill', 'id']);
		await schemaBuilder.createIndex('execution_entity', ['stoppedAt']);
		await schemaBuilder.createIndex('execution_entity', ['workflowId', 'id']);
	}
}
