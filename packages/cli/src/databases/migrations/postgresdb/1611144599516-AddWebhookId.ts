import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class AddWebhookId1611144599516 implements MigrationInterface {
	name = 'AddWebhookId1611144599516';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}webhook_entity ADD "webhookId" character varying`,
		);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "pathLength" integer`);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}16f4436789e804e3e1c9eeb240 ON ${tablePrefix}webhook_entity ("webhookId", "method", "pathLength") `,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}16f4436789e804e3e1c9eeb240`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "pathLength"`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "webhookId"`);
	}
}
