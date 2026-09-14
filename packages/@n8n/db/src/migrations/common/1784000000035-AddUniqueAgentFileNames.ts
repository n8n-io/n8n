import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddUniqueAgentFileNames1784000000035 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex } }: MigrationContext) {
		await createIndex('agent_files', ['agentId', 'fileName'], true);
		await createIndex('agent_files', ['agentId', 'binaryDataId'], true);
	}

	async down({ schemaBuilder: { dropIndex } }: MigrationContext) {
		await dropIndex('agent_files', ['agentId', 'binaryDataId'], { skipIfMissing: true });
		await dropIndex('agent_files', ['agentId', 'fileName'], { skipIfMissing: true });
	}
}
