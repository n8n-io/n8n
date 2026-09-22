import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'instance_monitoring_report';

export class CreateInstanceMonitoringReportTable1788445119184 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await // No secondary index: the table grows by one row a day, so the lookups
		// against it (newest undelivered, gap since the last delivered) scan a
		// trivial number of rows. `createdAt` is when the report was generated.
		createTable(TABLE_NAME).withColumns(
			column('id').uuid.primary.notNull.comment('UUID; travels with the payload as its `batchId`.'),
			column('dataPoints').json.notNull.comment(
				'The data point array exactly as sent to the receiver.',
			),
			column('status')
				.varchar(64)
				.notNull.default("'pending'")
				.withEnumCheck(['pending', 'delivered', 'skipped_after_max_retries'])
				.comment(
					'Skipped means the instance stopped trying that day, not that the numbers were lost: only a delivered report crosses a day off, so a skipped day is covered by the next report.',
				),
			column('deliveredAt')
				.timestampTimezone()
				.comment('When the receiver accepted the report; NULL while undelivered.'),
			column('attempts')
				.int.notNull.default(0)
				.comment('Delivery attempts made so far, successful or not. Three ends the report.'),
			column('lastAttemptAt')
				.timestampTimezone()
				.comment(
					'When the last attempt finished; NULL before the first. Paces retries across a restart.',
				),
			column('lastError').text.comment('Message of the most recent delivery failure.'),
		).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(TABLE_NAME);
	}
}
