import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agents';

export class AddSkillsColumnToAgents1781000000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(table, [column('skills').json.notNull.default("'{}'")]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(table, ['skills']);
	}
}
