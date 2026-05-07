import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const persistedRuntimeTables = [
	'ai_builder_temporary_workflow',
	'instance_ai_checkpoints',
	'instance_ai_iteration_logs',
	'instance_ai_run_snapshots',
	'instance_ai_messages',
	'instance_ai_resources',
	'instance_ai_threads',
] as const;

const obsoleteTables = [
	'instance_ai_workflow_snapshots',
	'instance_ai_observational_memory',
] as const;

export class ResetInstanceAiNativePersistence1778060000000 implements IrreversibleMigration {
	async up({ queryRunner, escape, schemaBuilder: { dropTable } }: MigrationContext) {
		for (const table of persistedRuntimeTables) {
			await queryRunner.query(`DELETE FROM ${escape.tableName(table)}`);
		}

		for (const table of obsoleteTables) {
			await dropTable(table);
		}
	}
}
