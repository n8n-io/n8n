import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class IndexSelfHealingInvestigationActivity1794320826000 implements ReversibleMigration {
	async up({ schemaBuilder: { createIndex, dropIndex } }: MigrationContext) {
		await createIndex('self_healing_investigation', ['configurationId', 'createdAt']);
		await dropIndex('self_healing_investigation', ['configurationId']);
	}

	async down({ schemaBuilder: { createIndex, dropIndex } }: MigrationContext) {
		await createIndex('self_healing_investigation', ['configurationId']);
		await dropIndex('self_healing_investigation', ['configurationId', 'createdAt']);
	}
}
