import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const runtimeTables = [
	'ai_builder_temporary_workflow',
	'instance_ai_checkpoints',
	'instance_ai_iteration_logs',
	'instance_ai_run_snapshots',
	'instance_ai_messages',
	'instance_ai_resources',
	'instance_ai_threads',
] as const;

export class ResetInstanceAiNativePersistence1784000000005 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		for (const table of runtimeTables) {
			await queryRunner.query(`DELETE FROM ${escape.tableName(table)}`);
		}
	}
}
