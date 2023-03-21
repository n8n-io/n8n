import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class MigrateExecutionStatus1676996103000 implements MigrationInterface {
	name = 'MigrateExecutionStatus1676996103000';
	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`UPDATE \`${tablePrefix}execution_entity\` SET status='waiting' WHERE status IS NULL AND \`waitTill\` IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE \`${tablePrefix}execution_entity\` SET status='failed' WHERE status IS NULL AND finished=0 AND \`stoppedAt\` IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE \`${tablePrefix}execution_entity\` SET status='success' WHERE status IS NULL AND finished=1 AND \`stoppedAt\` IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE \`${tablePrefix}execution_entity\` SET status='crashed' WHERE status IS NULL;`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {}
}
