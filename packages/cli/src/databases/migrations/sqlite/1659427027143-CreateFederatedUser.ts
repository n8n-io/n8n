import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../../../config';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class CreateFederatedUser1659427027143 implements MigrationInterface {
	name = 'CreateFederatedUser1659427027143';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}federated_user ("userId" integer NOT NULL, "identifier" varchar(255) NOT NULL, "issuer" varchar(255) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "FK_5e7fb4k5haeclpbe9ocsv7ofdc" FOREIGN KEY ("userId") REFERENCES ${tablePrefix}user ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("userId", "issuer"), CONSTRAINT "UQ_${tablePrefix}etflhkxxbaa3xz73ip35pr55s9" UNIQUE ("identifier", "issuer"))`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(`DROP TABLE ${tablePrefix}federated_user`);
	}
}
