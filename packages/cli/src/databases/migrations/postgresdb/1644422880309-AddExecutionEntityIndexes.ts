import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class AddExecutionEntityIndexes1644422880309 implements MigrationInterface {
	name = 'AddExecutionEntityIndexes1644422880309';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');

		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(
			`DROP INDEX IF EXISTS "${schema}".IDX_${tablePrefixPure}c4d999a5e90784e8caccf5589d`,
		);
		await queryRunner.query(
			`DROP INDEX IF EXISTS "${schema}".IDX_${tablePrefixPure}ca4a71b47f28ac6ea88293a8e2`,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}33228da131bb1112247cf52a42" ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}58154df94c686818c99fb754ce" ON ${tablePrefix}execution_entity ("workflowId", "waitTill", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}4f474ac92be81610439aaad61e" ON ${tablePrefix}execution_entity ("workflowId", "finished", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}72ffaaab9f04c2c1f1ea86e662" ON ${tablePrefix}execution_entity ("finished", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}85b981df7b444f905f8bf50747" ON ${tablePrefix}execution_entity ("waitTill", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefixPure}d160d4771aba5a0d78943edbe3" ON ${tablePrefix}execution_entity ("workflowId", "id") `,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');

		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}d160d4771aba5a0d78943edbe3"`,
		);
		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}85b981df7b444f905f8bf50747"`,
		);
		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}72ffaaab9f04c2c1f1ea86e662"`,
		);
		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}4f474ac92be81610439aaad61e"`,
		);
		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}58154df94c686818c99fb754ce"`,
		);
		await queryRunner.query(
			`DROP INDEX "IDX_${tablePrefixPure}33228da131bb1112247cf52a42"`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefixPure}ca4a71b47f28ac6ea88293a8e2" ON ${tablePrefix}execution_entity ("waitTill") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefixPure}c4d999a5e90784e8caccf5589d" ON ${tablePrefix}execution_entity ("workflowId") `,
		);
	}
}
