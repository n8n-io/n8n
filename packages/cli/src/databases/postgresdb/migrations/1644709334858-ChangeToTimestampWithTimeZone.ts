import {MigrationInterface, QueryRunner} from "typeorm";

import * as config from '../../../../config';

export class ChangeToTimestampWithTimeZone1644679445231 implements MigrationInterface {
	name = 'ChangeToTimestampWithTimeZone1644679445231';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		// You cannot define a TIMESTAMPTZ column with a specific precision for fractional seconds other than 6.

		// CredentialsEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6)`);
		// ExecutionEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "stoppedAt" TYPE TIMESTAMPTZ`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "waitTill" TYPE TIMESTAMPTZ`);
		// TagEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6)`);
		// WorkflowEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6)`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		// CredentialsEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
		// ExecutionEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "startedAt" TYPE TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "stoppedAt" TYPE TIMESTAMP`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ALTER COLUMN "waitTill" TYPE TIMESTAMP`);
		// TagEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
		// WorkflowEntity
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
	}
}
