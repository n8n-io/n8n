import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * The n8n Assistant streams through the Agents runtime and its chat UI reads
 * Agents sessions, so the Assistant event log has no readers left.
 */
export class DropInstanceAiEvents1791261269373 implements IrreversibleMigration {
	async up({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('instance_ai_events');
	}
}
