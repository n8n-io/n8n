import type { MigrationContext, ReversibleMigration } from '@db/types';

export class MessageEventBusDestinations1671535397530 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}event_destinations (` +
				'`id` varchar(36) PRIMARY KEY NOT NULL,' +
				'`destination` text NOT NULL,' +
				'`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP' +
				") ENGINE='InnoDB';",
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}event_destinations"`);
	}
}
