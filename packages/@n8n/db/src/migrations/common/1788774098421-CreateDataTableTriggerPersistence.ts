import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateDataTableTriggerPersistence1788774098421 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('data_table_trigger_subscription')
			.withColumns(
				column('id').uuid.primary,
				column('workflowId').varchar(36).notNull,
				column('nodeId').varchar(36).notNull,
				column('projectId').varchar(36).notNull,
				column('dataTableId').varchar(36).notNull,
				column('event')
					.varchar(20)
					.notNull.withEnumCheck(['rowInserted', 'rowDeleted', 'columnUpdated'])
					.comment('Data Table row mutation that creates a delivery'),
				column('columnId').varchar(36),
			)
			.withUniqueConstraintOn(['workflowId', 'nodeId'])
			.withIndexOn(['dataTableId', 'event', 'columnId'])
			.withIndexOn('projectId')
			.withIndexOn('columnId')
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: 'project',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('dataTableId', {
				tableName: 'data_table',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('columnId', {
				tableName: 'data_table_column',
				columnName: 'id',
				onDelete: 'RESTRICT',
			}).withTimestamps;

		await createTable('data_table_mutation_event')
			.withColumns(
				column('id').uuid.primary,
				column('dataTableId').varchar(36).notNull,
				column('rowId').int.notNull,
				column('event')
					.varchar(20)
					.notNull.withEnumCheck(['rowInserted', 'rowDeleted', 'columnUpdated'])
					.comment('Committed Data Table row mutation'),
				column('payload').json.notNull.comment('Immutable trigger payload for the row mutation'),
				column('occurredAt').timestampTimezone().notNull,
			)
			.withIndexOn(['dataTableId', 'occurredAt'])
			.withForeignKey('dataTableId', {
				tableName: 'data_table',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		await createTable('data_table_trigger_delivery')
			.withColumns(
				column('id').uuid.primary,
				column('eventId').uuid.notNull,
				column('workflowId').varchar(36).notNull,
				column('nodeId').varchar(36).notNull,
				column('executionId').bigint,
				column('status')
					.varchar(20)
					.notNull.default("'pending'")
					.withEnumCheck(['pending', 'in_progress', 'completed', 'failed', 'cancelled'])
					.comment('Current durable delivery state'),
				column('attempts').smallint.notNull.default(0),
				column('claimedBy').varchar(36),
				column('leaseEpoch').int.notNull.default(0),
				column('leaseExpiresAt').timestampTimezone(),
				column('nextAttemptAt').timestampTimezone(),
				column('dispatchedAt').timestampTimezone(),
				column('finishedAt').timestampTimezone(),
				column('error').text,
			)
			.withUniqueConstraintOn(['eventId', 'workflowId', 'nodeId'])
			.withIndexOn(['status', 'nextAttemptAt', 'id'])
			.withIndexOn(['status', 'leaseExpiresAt', 'id'])
			.withIndexOn('executionId')
			.withIndexOn('workflowId')
			.withForeignKey('eventId', {
				tableName: 'data_table_mutation_event',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('data_table_trigger_delivery');
		await dropTable('data_table_mutation_event');
		await dropTable('data_table_trigger_subscription');
	}
}
