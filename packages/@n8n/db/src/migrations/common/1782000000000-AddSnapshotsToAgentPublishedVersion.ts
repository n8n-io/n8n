import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_published_version';

export class AddSnapshotsToAgentPublishedVersion1782000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [column('tools').json, column('skills').json]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['tools', 'skills']);
	}
}
