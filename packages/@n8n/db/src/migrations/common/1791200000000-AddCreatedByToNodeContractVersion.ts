import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'node_contract_version';

/**
 * Adds who added a version. A custom action that someone on the instance publishes names its
 * author, so other users know whom to ask about it. Other versions have none.
 */
export class AddCreatedByToNodeContractVersion1791200000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addForeignKey, column } }: MigrationContext) {
		await addColumns(
			table,
			[column('createdById').uuid.comment('The user who published the version on this instance')],
			{ recreatesOnSqlite: true },
		);
		await addForeignKey(table, 'createdById', ['user', 'id'], undefined, 'SET NULL');
	}

	async down({ schemaBuilder: { dropColumns, dropForeignKey } }: MigrationContext) {
		await dropForeignKey(table, 'createdById', ['user', 'id']);
		await dropColumns(table, ['createdById'], { recreatesOnSqlite: true });
	}
}
