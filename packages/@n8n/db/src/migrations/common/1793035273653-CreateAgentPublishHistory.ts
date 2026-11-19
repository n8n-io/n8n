import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentPublishHistory1793035273653 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, runQuery } = ctx;
		// Raw ALTER preserves incoming SQLite foreign keys.

		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} ADD COLUMN ${escape.columnName('publicationRevision')} integer NOT NULL DEFAULT 0`,
		);

		const { createTable, column } = ctx.schemaBuilder;

		await createTable('agent_publish_history')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('agentId').varchar(36).notNull,
				column('versionId').varchar(36),
				column('event')
					.varchar(16)
					.notNull.withEnumCheck(['activated', 'deactivated'])
					.comment('Publication or explicit unpublication'),
				column('userId').uuid,
				column('author').varchar(255).notNull,
				column('isLegacy')
					.bool.notNull.default(false)
					.comment('Legacy publication with an unknown end time'),
			)
			.withCreatedAt.withIndexOn(['agentId', 'id'])
			.withIndexOn('versionId')
			.withIndexOn('userId')
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('versionId', {
				tableName: 'agent_history',
				columnName: 'versionId',
				onDelete: 'SET NULL',
			})
			.withForeignKey('userId', { tableName: 'user', columnName: 'id', onDelete: 'SET NULL' });

		await this.copyPublications(ctx);
	}

	private async copyPublications({ escape, runQuery }: MigrationContext) {
		const c = escape.columnName;
		const columns = ['agentId', 'versionId', 'event', 'userId', 'author', 'isLegacy', 'createdAt']
			.map(c)
			.join(', ');

		await runQuery(`INSERT INTO ${escape.tableName('agent_publish_history')} (${columns})
			SELECT ${c('agentId')}, ${c('versionId')}, 'activated', ${c('publishedById')}, ${c('author')}, true, ${c('createdAt')}
			FROM ${escape.tableName('agent_history')} ORDER BY ${c('createdAt')}, ${c('versionId')}`);
	}

	async down({ schemaBuilder: { dropTable }, escape, runQuery }: MigrationContext) {
		await dropTable('agent_publish_history');

		await runQuery(
			`ALTER TABLE ${escape.tableName('agents')} DROP COLUMN ${escape.columnName('publicationRevision')}`,
		);
	}
}
