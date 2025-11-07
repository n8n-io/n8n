import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddAPIKeyColumn1652905585850 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE `' + tablePrefix + 'user` ADD COLUMN `apiKey` VARCHAR(255)',
		);
		await queryRunner.query(
			'CREATE UNIQUE INDEX `UQ_' +
				tablePrefix +
				'ie0zomxves9w3p774drfrkxtj5` ON `' +
				tablePrefix +
				'user` (`apiKey`)',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DROP INDEX \`UQ_${tablePrefix}ie0zomxves9w3p774drfrkxtj5\` ON \`${tablePrefix}user\``,
		);
		await queryRunner.query('ALTER TABLE `' + tablePrefix + 'user` DROP COLUMN `apiKey`');
	}
}
