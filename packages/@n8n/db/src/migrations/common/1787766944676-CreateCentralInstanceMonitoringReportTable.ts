import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'central_instance_monitoring_report';

export class CreateCentralInstanceMonitoringReportTable1787766944676
	implements ReversibleMigration
{
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await // No secondary index: the table grows by one row a day, so the lookups
		// against it (newest undelivered, gap since the last delivered) scan a
		// trivial number of rows. `createdAt` is when the report was generated.
		createTable(TABLE_NAME).withColumns(
			column('id')
				.varchar(36)
				.primary.comment('Nanoid; travels with the payload as its `batchId`.'),
			column('dataPoints').json.notNull.comment(
				'The data point array exactly as sent to the receiver.',
			),
			column('deliveredAt')
				.timestampTimezone()
				.comment('When the receiver accepted the report; NULL while undelivered.'),
			column('attempts')
				.int.notNull.default(0)
				.comment('Delivery attempts made so far, successful or not.'),
			column('lastError').text.comment('Message of the most recent delivery failure.'),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE_NAME);
	}
}
