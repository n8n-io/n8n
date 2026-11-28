import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddProjectIdToPromotionReview1795791372406 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex }, escape, runQuery, isPostgres }: MigrationContext) {
		const table = escape.tableName('promotion_review');
		const projectId = escape.columnName('projectId');

		// A raw ADD COLUMN keeps SQLite from recreating the table, which would clear `promotion_run.reviewId`.
		await runQuery(
			`ALTER TABLE ${table} ADD COLUMN ${projectId} varchar(36) ` +
				'CONSTRAINT "FK_promotion_review_projectId" ' +
				`REFERENCES ${escape.tableName('project')} (${escape.columnName('id')}) ON DELETE SET NULL`,
		);
		await createIndex('promotion_review', ['projectId']);

		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${projectId} IS 'The team project whose changes the review holds. NULL for a promotion of the whole instance, or after the project is deleted. Only instance owners and admins can see and approve those reviews'`,
			);
		}
	}

	async down({ schemaBuilder: { dropColumns, dropIndex } }: MigrationContext) {
		await dropIndex('promotion_review', ['projectId']);
		await dropColumns('promotion_review', ['projectId'], { recreatesOnSqlite: true });
	}
}
