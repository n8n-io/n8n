import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIsEphemeralToWorkflowEntity1776300000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [column('isEphemeral').bool.notNull.default(false)]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['isEphemeral']);
	}
}
