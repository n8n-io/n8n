import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Add new indices:
 *
 * - `workflowId, startedAt` for `ExecutionRepository.findManyByRangeQuery` (default query) and for `ExecutionRepository.findManyByRangeQuery` (filter query)
 * - `waitTill, status, deletedAt` for `ExecutionRepository.getWaitingExecutions`
 * - `stoppedAt, status, deletedAt` for `ExecutionRepository.softDeletePrunableExecutions`
 *
 * Remove unused indices in sqlite:
 *
 * - `stoppedAt` (duplicate with different casing)
 * - `waitTill`
 * - `status, workflowId`
 *
 * Remove unused indices in MySQL:
 *
 * - `status`
 *
 * Remove unused indices in all DBs:
 *
 * - `waitTill, id`
 * - `workflowId, id`
 *
 * Remove incomplete index in all DBs:
 *
 * - `stopped_at` (replaced with composite index)
 *
 * Keep index as is:
 *
 * - `deletedAt` for query at `ExecutionRepository.hardDeleteSoftDeletedExecutions`
 */
export class RefactorExecutionIndices1723796243146 implements ReversibleMigration {
	async up({ schemaBuilder, isPostgres, isSqlite, isMysql, runQuery, escape }: MigrationContext) {
		if (isSqlite || isPostgres) {
			const executionEntity = escape.tableName('execution_entity');

			const workflowId = escape.columnName('workflowId');
			const startedAt = escape.columnName('startedAt');
			const waitTill = escape.columnName('waitTill');
			const status = escape.columnName('status');
			const deletedAt = escape.columnName('deletedAt');
			const stoppedAt = escape.columnName('stoppedAt');

			await runQuery(`
				CREATE INDEX idx_execution_entity_workflow_id_started_at
				ON ${executionEntity} (${workflowId}, ${startedAt})
				WHERE ${startedAt} IS NOT NULL AND ${deletedAt} IS NULL;
			`);

			await runQuery(`
				CREATE INDEX idx_execution_entity_wait_till_status_deleted_at
				ON ${executionEntity} (${waitTill}, ${status}, ${deletedAt})
				WHERE ${waitTill} IS NOT NULL AND ${deletedAt} IS NULL;
			`);

			await runQuery(`
				CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at
				ON ${executionEntity} (${stoppedAt}, ${status}, ${deletedAt})
				WHERE ${stoppedAt} IS NOT NULL AND ${deletedAt} IS NULL;
			`);
		} else if (isMysql) {
			await schemaBuilder.createIndex('execution_entity', ['workflowId', 'startedAt']);
			await schemaBuilder.createIndex('execution_entity', ['waitTill', 'status', 'deletedAt']);
			await schemaBuilder.createIndex('execution_entity', ['stoppedAt', 'status', 'deletedAt']);
		}

		if (isSqlite) {
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

		await schemaBuilder.dropIndex(
			'execution_entity',
			['stoppedAt'],
			isSqlite ? { customIndexName: 'idx_execution_entity_stopped_at', skipIfMissing: true } : {},
		);
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
		await schemaBuilder.dropIndex('execution_entity', ['workflowId', 'startedAt']);
		await schemaBuilder.dropIndex('execution_entity', ['waitTill', 'status']);
		await schemaBuilder.dropIndex('execution_entity', ['stoppedAt', 'deletedAt', 'status']);

		await schemaBuilder.createIndex('execution_entity', ['waitTill', 'id']);
		await schemaBuilder.createIndex('execution_entity', ['stoppedAt']);
		await schemaBuilder.createIndex('execution_entity', ['workflowId', 'id']);
	}
}
