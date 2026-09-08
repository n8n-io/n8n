import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreatePollerStateTable1785926660580 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, tablePrefix }: MigrationContext) {
		await createTable('poller_state')
			.withColumns(
				column('workflowId').varchar(36).primary,
				column('nodeId').varchar(36).primary,
				column('cursor')
					.json.notNull.default("'{}'")
					.comment(
						'How far the poll node has consumed its source, in whatever shape that node uses.',
					),
				column('consecutiveErrors')
					.int.notNull.default(0)
					.comment('Polls that have failed since the last successful one.'),
				column('backoffUntil')
					.timestampTimezone()
					.comment('Time before which no poll is attempted; NULL when not backing off.'),
			)
			.withTimestamps.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}poller_state_workflowId`,
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('poller_state');
	}
}
