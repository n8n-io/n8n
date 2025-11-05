import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddS3KeyToExecutionData1762277580000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_data\` MODIFY COLUMN \`data\` MEDIUMTEXT NULL`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_data\` 
			ADD COLUMN \`s3Key\` varchar(255) NULL,
			ADD COLUMN \`storageMode\` varchar(50) NOT NULL DEFAULT 'database'`,
		);

		await queryRunner.query(
			`CREATE INDEX \`IDX_${tablePrefix}execution_data_s3Key\` ON \`${tablePrefix}execution_data\` (\`s3Key\`)`,
		);

		await queryRunner.query(
			`CREATE INDEX \`IDX_${tablePrefix}execution_data_storageMode\` ON \`${tablePrefix}execution_data\` (\`storageMode\`)`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DROP INDEX \`IDX_${tablePrefix}execution_data_s3Key\` ON \`${tablePrefix}execution_data\``,
		);
		await queryRunner.query(
			`DROP INDEX \`IDX_${tablePrefix}execution_data_storageMode\` ON \`${tablePrefix}execution_data\``,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_data\` 
			DROP COLUMN \`s3Key\`,
			DROP COLUMN \`storageMode\``,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_data\` MODIFY COLUMN \`data\` MEDIUMTEXT NOT NULL`,
		);
	}
}
