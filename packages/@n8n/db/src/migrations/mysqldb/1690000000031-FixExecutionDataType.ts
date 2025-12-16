import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class FixExecutionDataType1690000000031 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		/**
		 * SeparateExecutionData migration for MySQL/MariaDB accidentally changed the data-type for `data` column to `TEXT`.
		 * This migration changes it back.
		 * The previous migration has been patched to avoid converting to `TEXT`, which might fail.
		 *
		 * For any users who already ran the previous migration, this migration should fix the column type.
		 * For any users who run these migrations in the same batch, this migration would be no-op, as the column type is already `MEDIUMTEXT`
		 */
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'execution_data` MODIFY COLUMN `data` MEDIUMTEXT',
		);
	}
}
