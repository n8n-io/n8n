import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class AddUserIdToAgentCheckpoints1781000000000 implements IrreversibleMigration {
	async up({ schemaBuilder: { addColumns, column }, runQuery, tablePrefix }: MigrationContext) {
		// Checkpoints are transient suspension state. Drop all existing rows so
		// the new non-nullable userId column can be added without a default value.
		await runQuery(`DELETE FROM ${tablePrefix}agent_checkpoints`);

		await addColumns('agent_checkpoints', [column('userId').varchar(255).notNull]);
	}
}
