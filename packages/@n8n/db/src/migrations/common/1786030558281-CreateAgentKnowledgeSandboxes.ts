import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateAgentKnowledgeSandboxes1786030558281 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('agent_knowledge_sandboxes')
			.withColumns(
				column('agentId').varchar(36).primary,
				column('provider')
					.varchar(16)
					.primary.withEnumCheck(['daytona', 'n8n-sandbox'])
					.comment('Sandbox provider: daytona or n8n-sandbox'),
				column('sandboxId')
					.varchar(255)
					.notNull.comment('Opaque remote sandbox identifier assigned by the provider'),
			)
			.withTimestamps.withForeignKey('agentId', {
				tableName: 'agents',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('agent_knowledge_sandboxes');
	}
}
