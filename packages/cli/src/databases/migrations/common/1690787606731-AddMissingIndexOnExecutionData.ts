import type { ReversibleMigration, MigrationContext } from '@/databases/types';

export class AddMissingIndexOnExecutionData1690787606731 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.createPrimaryKey(
			`${tablePrefix}execution_data`,
			['executionId'],
			`PK_${tablePrefix}execution_data_executionId`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.dropPrimaryKey(
			`${tablePrefix}execution_data`,
			`PK_${tablePrefix}execution_data_executionId`,
		);
	}
}
