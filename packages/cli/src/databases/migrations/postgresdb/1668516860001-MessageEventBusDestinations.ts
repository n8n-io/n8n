import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class MessageEventBusDestinations1668516860001 implements MigrationInterface {
	name = 'MessageEventBusDestinations1668516860001';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}eventdestinations_entity (` +
				`"id" UUID PRIMARY KEY NOT NULL,` +
				`"destination" JSONB NOT NULL,` +
				`"createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,` +
				`"updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE "${tablePrefix}eventdestinations_entity"`);
		logMigrationEnd(this.name);
	}
}
