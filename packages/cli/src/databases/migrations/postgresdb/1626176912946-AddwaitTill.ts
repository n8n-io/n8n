import {MigrationInterface, QueryRunner} from "typeorm";
import config from '@/config';

export class AddwaitTill1626176912946 implements MigrationInterface {
	name = 'AddwaitTill1626176912946';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ADD "waitTill" TIMESTAMP`);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixPure}ca4a71b47f28ac6ea88293a8e2 ON ${tablePrefix}execution_entity ("waitTill")`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`DROP INDEX IDX_${tablePrefixPure}ca4a71b47f28ac6ea88293a8e2`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "waitTill"`);
	}

}
