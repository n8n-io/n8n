import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'agent_determinism_source';

export class CreateAgentDeterminismSourceTable1795007641160 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(table)
			.withColumns(
				column('id').varchar(36).primary,
				column('sourceType').varchar(16).notNull,
				column('sourceId').varchar(36).notNull,
				column('projectId').varchar(36).notNull,
				column('versionHash').varchar(64).notNull,
				column('runsSinceAnalysis').int.notNull.default(0),
				column('analysisStatus').varchar(16).notNull,
				column('analyzedVersionHash').varchar(64),
				column('draftWorkflowId').varchar(36),
				column('result').json,
				column('dismissedAt').timestampTimezone(3),
			)
			.withTimestamps.withIndexOn(['sourceType', 'sourceId'], true);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(table);
	}
}
