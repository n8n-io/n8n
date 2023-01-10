import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class MessageEventBusDestinations1671535397530 implements MigrationInterface {
	name = 'MessageEventBusDestinations1671535397530';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}event_destinations (` +
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
		await queryRunner.query(`DROP TABLE "${tablePrefix}event_destinations"`);
		logMigrationEnd(this.name);
	}
}
