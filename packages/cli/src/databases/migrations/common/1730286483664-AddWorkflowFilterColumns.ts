import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddWorkflowFilterColumns1730286483664 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		console.log('foo');
		await addColumns('workflow_entity', [column('credentialIds').text]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', ['credentialIds']);
	}
}
