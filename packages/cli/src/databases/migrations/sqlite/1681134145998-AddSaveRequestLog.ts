import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class AddSaveRequestLog1681134145998 implements MigrationInterface {
	name = 'AddSaveRequestLog1681134145998';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		logMigrationStart(this.name);

		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}save_request_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "request" jsonb DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "workflowId" integer NOT NULL, "response" jsonb DEFAULT '{}', "status" VARCHAR(128) NOT NULL, CONSTRAINT "PK_a2a6978768567cd32a5d6cc2797" PRIMARY KEY ("id"))
		`);

		await queryRunner.query(
			`
				ALTER TABLE "${tablePrefix}save_request_log" ADD CONSTRAINT "FK_9a3caef176a6bd386c9ca3b3798" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO action
			`,
		);

		await queryRunner.query(
			`
				ALTER TABLE "${tablePrefix}save_request_log" ADD CONSTRAINT "FK_9a3caef176a6bd386c9ca3b3799" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity"("id") ON DELETE NO ACTION ON UPDATE NO action
			`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}save_request_log" DROP CONSTRAINT "FK_9a3caef176a6bd386c9ca3b3799"`,
		);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}save_request_log" DROP CONSTRAINT "FK_9a3caef176a6bd386c9ca3b3798"`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}save_request_log"`);
	}
}
