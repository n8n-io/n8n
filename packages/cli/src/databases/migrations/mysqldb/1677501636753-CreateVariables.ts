import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateVariables1677501636753 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			CREATE TABLE ${tablePrefix}variables (
				id int(11) auto_increment NOT NULL PRIMARY KEY,
				\`key\` VARCHAR(50) NOT NULL,
				\`type\` VARCHAR(50) DEFAULT 'string' NOT NULL,
				value VARCHAR(255) NULL,
				UNIQUE (\`key\`)
			)
			ENGINE=InnoDB;
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}variables;`);
	}
}
