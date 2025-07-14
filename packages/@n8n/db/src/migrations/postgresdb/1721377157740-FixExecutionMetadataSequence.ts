import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class FixExecutionMetadataSequence1721377157740 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName('execution_metadata');
		const sequenceName = escape.tableName('execution_metadata_temp_id_seq');

		await queryRunner.query(
			`SELECT setval('${sequenceName}', (SELECT MAX(id) FROM ${tableName}));`,
		);
	}
}
