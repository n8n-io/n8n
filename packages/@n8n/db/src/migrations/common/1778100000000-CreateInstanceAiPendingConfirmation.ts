import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateInstanceAiPendingConfirmation1778100000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('instance_ai_pending_confirmation')
			.withColumns(
				column('requestId').varchar(36).primary.notNull,
				column('threadId').uuid.notNull,
				column('userId').varchar(36).notNull,
				column('kind').varchar(16).notNull,
				column('mastraRunId').varchar(64),
				column('toolCallId').varchar(64),
				column('runId').varchar(64).notNull,
				column('messageGroupId').varchar(64),
				column('checkpointTaskId').varchar(36),
				column('expiresAt').timestampTimezone().notNull,
			)
			.withForeignKey('threadId', {
				tableName: 'instance_ai_threads',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn('threadId')
			.withIndexOn('expiresAt').withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('instance_ai_pending_confirmation');
	}
}
