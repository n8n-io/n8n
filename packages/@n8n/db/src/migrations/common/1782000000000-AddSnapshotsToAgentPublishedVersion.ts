import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_published_version';

export class AddSnapshotsToAgentPublishedVersion1782000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, runQuery, escape }: MigrationContext) {
		await addColumns(table, [column('tools').json, column('skills').json]);
		// Backfill: existing rows pre-date skill snapshotting and would otherwise
		// stay NULL forever. Initialise to an empty object so downstream code can
		// treat "no snapshot recorded" identically to "agent has no skills".
		const tableName = escape.tableName(table);
		const skillsColumn = escape.columnName('skills');
		await runQuery(`UPDATE ${tableName} SET ${skillsColumn} = '{}' WHERE ${skillsColumn} IS NULL`);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['tools', 'skills']);
	}
}
