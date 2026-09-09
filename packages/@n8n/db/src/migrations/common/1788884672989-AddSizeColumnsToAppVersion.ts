import type { MigrationContext, ReversibleMigration } from '../migration-types';

const APP_VERSION_TABLE = 'app_version';

/**
 * Byte sizes of each version's tarballs, so a project's total app storage can
 * be summed without reading blobs back from storage.
 *
 * Known limitation: rows that predate this migration default to 0/null, so
 * the quota sum ignores their real size until a separate backfill lands.
 */
export class AddSizeColumnsToAppVersion1788884672989 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			APP_VERSION_TABLE,
			[
				column('sourceSizeBytes')
					.int.notNull.default(0)
					.comment('Size of the source tarball, in bytes'),
				column('distSizeBytes').int.comment(
					'Size of the dist tarball, in bytes; null once pruned by retention',
				),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(APP_VERSION_TABLE, ['sourceSizeBytes', 'distSizeBytes'], {
			recreatesOnSqlite: true,
		});
	}
}
