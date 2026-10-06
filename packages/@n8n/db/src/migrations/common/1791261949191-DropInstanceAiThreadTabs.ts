import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/** Assistant artifact tabs now live in the Agents thread metadata. */
export class DropInstanceAiThreadTabs1791261949191 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('instance_ai_thread_tabs');
	}
}
