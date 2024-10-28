import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddStatusToExecutions1674138566000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` ADD COLUMN "status" varchar`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN "status"`);
	}
}
