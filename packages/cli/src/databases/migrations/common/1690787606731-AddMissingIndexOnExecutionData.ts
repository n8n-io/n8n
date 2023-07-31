import type { ReversibleMigration, MigrationContext } from '@/databases/types';

export class AddMissingIndexOnExecutionData1690787606731 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, dbType }: MigrationContext) {
		if (dbType === 'sqlite' || dbType === 'postgresdb') {
			await queryRunner.query(
				`CREATE UNIQUE INDEX "PK_${tablePrefix}execution_data_executionId" ON "${tablePrefix}execution_data"("executionId");`,
			);
		} else {
			await queryRunner.query(
				`CREATE UNIQUE INDEX \`PK_${tablePrefix}execution_data_executionId\` ON \`${tablePrefix}execution_data\`(\`executionId\`);`,
			);
		}
	}

	async down({ queryRunner, tablePrefix, dbType }: MigrationContext) {
		if (dbType === 'sqlite' || dbType === 'postgresdb') {
			await queryRunner.query(`DROP INDEX "PK_${tablePrefix}execution_data_executionId"`);
		} else {
			await queryRunner.query(
				`DROP INDEX \`PK_${tablePrefix}execution_data_executionId\` ON \`${tablePrefix}execution_data\``,
			);
		}
	}
}
