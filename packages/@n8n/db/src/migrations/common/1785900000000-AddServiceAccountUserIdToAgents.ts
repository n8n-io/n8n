import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AGENTS_TABLE = 'agents';
const COLUMN = 'serviceAccountUserId';
const FK_NAME = 'FK_agents_serviceAccountUserId';

/**
 * Gives each agent a nullable 1:1 pointer to its service-account `User`. The FK
 * uses `ON DELETE SET NULL` so deleting the service account clears the pointer
 * rather than orphaning it.
 *
 * On SQLite both the column add and the FK add recreate `agents`, which several
 * tables reference with CASCADE FKs; the sqlite/ subclass sets `withFKsDisabled`
 * so the recreation does not cascade.
 */
export class AddServiceAccountUserIdToAgents1785900000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column, addForeignKey } }: MigrationContext) {
		await addColumns(AGENTS_TABLE, [column(COLUMN).uuid], { recreatesOnSqlite: true });
		await addForeignKey(AGENTS_TABLE, COLUMN, ['user', 'id'], FK_NAME, 'SET NULL');
	}

	async down({ schemaBuilder: { dropForeignKey, dropColumns } }: MigrationContext) {
		await dropForeignKey(AGENTS_TABLE, COLUMN, ['user', 'id'], FK_NAME);
		await dropColumns(AGENTS_TABLE, [COLUMN], { recreatesOnSqlite: true });
	}
}
