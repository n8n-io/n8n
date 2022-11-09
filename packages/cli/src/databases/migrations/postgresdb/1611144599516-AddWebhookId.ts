import {MigrationInterface, QueryRunner} from "typeorm";
import config from '@/config';

export class AddWebhookId1611144599516 implements MigrationInterface {
	name = 'AddWebhookId1611144599516';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "webhookId" character varying`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "pathLength" integer`);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240 ON ${tablePrefix}webhook_entity ("webhookId", "method", "pathLength") `);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`DROP INDEX IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "pathLength"`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "webhookId"`);
	}

}
