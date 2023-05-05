import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class MessageEventBusDestinations1671535397530 implements MigrationInterface {
	name = 'MessageEventBusDestinations1671535397530';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}event_destinations" (` +
				`"id"	varchar(36) PRIMARY KEY NOT NULL,` +
				`"destination" text NOT NULL,` +
				`"createdAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')',` +
				`"updatedAt"	datetime(3) NOT NULL DEFAULT 'STRFTIME(''%Y-%m-%d %H:%M:%f'', ''NOW'')'` +
				`);`,
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
