import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class CertifyCorrectCollation1623936588000 implements MigrationInterface {
	name = 'CertifyCorrectCollation1623936588000';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		const databaseType = config.getEnv('database.type');

		if (databaseType === 'mariadb') {
			// This applies to MySQL only.
			return;
		}

		const checkCollationExistence = await queryRunner.query(`show collation where collation like 'utf8mb4_0900_ai_ci';`);
		let collation = 'utf8mb4_general_ci';
		if (checkCollationExistence.length > 0) {
			collation = 'utf8mb4_0900_ai_ci';
		}

		const databaseName = config.getEnv(`database.mysqldb.database`);

		await queryRunner.query(`ALTER DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE ${collation};`);

		for (const tableName of [
			'credentials_entity',
			'execution_entity',
			'tag_entity',
			'webhook_entity',
			'workflow_entity',
			'workflows_tags',
		]) {
			await queryRunner.query(`ALTER TABLE ${tablePrefix}${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collation};`);
		}
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// There is nothing to undo in this case as we already expect default collation to be utf8mb4
		// This migration exists simply to enforce that n8n will work with
		// older mysql versions
	}

}
