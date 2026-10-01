import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = {
	threads: 'instance_ai_threads',
	messages: 'instance_ai_messages',
	resources: 'instance_ai_resources',
	observationalMemory: 'instance_ai_observational_memory',
	workflowSnapshots: 'instance_ai_workflow_snapshots',
	runSnapshots: 'instance_ai_run_snapshots',
	iterationLogs: 'instance_ai_iteration_logs',
} as const;

export class CreateInstanceAiTables1775000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table.threads)
			.withColumns(
				column('id').uuid.primary.notNull,
				column('resourceId').varchar(255).notNull,
				column('title').text.default("''").notNull,
				column('metadata').json,
			)
			.withIndexOn('resourceId').withTimestamps;

		await createTable(table.messages)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('threadId').uuid.notNull,
				column('content').text.notNull,
				column('role').varchar(16).notNull,
				column('type').varchar(32),
				column('resourceId').varchar(255),
			)
			.withIndexOn('threadId')
			.withIndexOn('resourceId')
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.resources).withColumns(
			column('id').varchar(255).primary.notNull,
			column('workingMemory').text,
			column('metadata').json,
		).withTimestamps;

		await createTable(table.observationalMemory)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('lookupKey').varchar(255).notNull,
				column('scope').varchar(16).notNull,
				column('threadId').uuid,
				column('resourceId').varchar(255).notNull,
				column('activeObservations').text.default("''").notNull,
				column('originType').varchar(32).notNull,
				column('config').text.notNull,
				column('generationCount').int.default(0).notNull,
				column('lastObservedAt').timestampTimezone(),
				column('pendingMessageTokens').int.default(0).notNull,
				column('totalTokensObserved').int.default(0).notNull,
				column('observationTokenCount').int.default(0).notNull,
				column('isObserving').bool.default(false).notNull,
				column('isReflecting').bool.default(false).notNull,
				column('observedMessageIds').json,
				column('observedTimezone').varchar(),
				column('bufferedObservations').text,
				column('bufferedObservationTokens').int,
				column('bufferedMessageIds').json,
				column('bufferedReflection').text,
				column('bufferedReflectionTokens').int,
				column('bufferedReflectionInputTokens').int,
				column('reflectedObservationLineCount').int,
				column('bufferedObservationChunks').json,
				column('isBufferingObservation').bool.default(false).notNull,
				column('isBufferingReflection').bool.default(false).notNull,
				column('lastBufferedAtTokens').int.default(0).notNull,
				column('lastBufferedAtTime').timestampTimezone(),
				column('metadata').json,
			)
			.withIndexOn('lookupKey')
			.withIndexOn(['scope', 'threadId', 'resourceId'], true)
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'SET NULL',
			}).withTimestamps;

		await createTable(table.workflowSnapshots)
			.withColumns(
				column('runId').varchar(36).primary.notNull,
				column('workflowName').varchar(255).primary.notNull,
				column('resourceId').varchar(255),
				column('status').varchar(),
				column('snapshot').text.notNull,
			)
			.withIndexOn(['workflowName', 'status']).withTimestamps;

		await createTable(table.runSnapshots)
			.withColumns(
				column('threadId').uuid.primary.notNull,
				column('runId').varchar(36).primary.notNull,
				column('messageGroupId').varchar(36),
				column('runIds').json,
				column('tree').text.notNull,
			)
			.withIndexOn(['threadId', 'messageGroupId'])
			.withIndexOn(['threadId', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable(table.iterationLogs)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('threadId').uuid.notNull,
				column('taskKey').varchar().notNull,
				column('entry').text.notNull,
			)
			.withIndexOn(['threadId', 'taskKey', 'createdAt'])
			.withForeignKey('threadId', {
				tableName: table.threads,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table.iterationLogs);
		await dropTable(table.runSnapshots);
		await dropTable(table.workflowSnapshots);
		await dropTable(table.observationalMemory);
		await dropTable(table.resources);
		await dropTable(table.messages);
		await dropTable(table.threads);
	}
}
