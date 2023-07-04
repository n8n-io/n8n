import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class FixExecutionDataType1690000000030 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_data` MODIFY COLUMN `data` MEDIUMTEXT',
		);
	}
}
