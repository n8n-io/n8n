import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class AddWorkflowFilterColumns1730286483664 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('workflow_entity', [
			column('credentialIds').text,
			column('nodeTypes').text,
			column('nodeNames').text,
			column('webhookURLs').text,
			column('httpNodeURLs').text,
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('workflow_entity', [
			'credentialIds',
			'nodeTypes',
			'nodeNames',
			'webhookURLs',
			'httpNodeURLs',
		]);
	}
}
