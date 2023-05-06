import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class CertifyCorrectCollation1623936588000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix, dbType, dbName }: MigrationContext) {
		if (dbType === 'mariadb') {
			// This applies to MySQL only.
			return;
		}

		const checkCollationExistence = (await queryRunner.query(
			"show collation where collation like 'utf8mb4_0900_ai_ci';",
		)) as unknown[];
		let collation = 'utf8mb4_general_ci';
		if (checkCollationExistence.length > 0) {
			collation = 'utf8mb4_0900_ai_ci';
		}

		await queryRunner.query(
			`ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE ${collation};`,
		);

		for (const tableName of [
			'credentials_entity',
			'execution_entity',
			'tag_entity',
			'webhook_entity',
			'workflow_entity',
			'workflows_tags',
		]) {
			await queryRunner.query(
				`ALTER TABLE ${tablePrefix}${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collation};`,
			);
		}
	}

	// There is no down migration in this case as we already expect default collation to be utf8mb4
	// The up migration exists simply to enforce that n8n will work with older mysql versions
}
