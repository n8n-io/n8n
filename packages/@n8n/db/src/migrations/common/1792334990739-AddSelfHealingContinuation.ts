import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSelfHealingContinuation1792334990739 implements ReversibleMigration {
	async up({ schemaBuilder: s, escape, isPostgres, runQuery }: MigrationContext) {
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('workflow_suggestion')}.${escape.columnName('resultKind')} IS 'Investigation outcome; fix_ready and needs_you permit draft application'`,
			);
		}
		await s.addColumns(
			'self_healing_result',
			[
				s.column('continuedAt').timestampTimezone().comment('First continuation of the result'),
				s.column('continuedById').uuid.comment('Reviewer who first continued the result'),
			],
			{ recreatesOnSqlite: true },
		);
		await s.addForeignKey(
			'self_healing_result',
			'continuedById',
			['user', 'id'],
			'FK_self_healing_result_continued_by',
			'SET NULL',
		);
		await s.createIndex('self_healing_result', ['continuedById']);
	}

	async down({ schemaBuilder: s, escape, isPostgres, runQuery }: MigrationContext) {
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('workflow_suggestion')}.${escape.columnName('resultKind')} IS 'Investigation outcome; only fix_ready permits Apply'`,
			);
		}
		await s.dropForeignKey(
			'self_healing_result',
			'continuedById',
			['user', 'id'],
			'FK_self_healing_result_continued_by',
		);
		await s.dropIndex('self_healing_result', ['continuedById']);
		await s.dropColumns('self_healing_result', ['continuedAt', 'continuedById'], {
			recreatesOnSqlite: true,
		});
	}
}
