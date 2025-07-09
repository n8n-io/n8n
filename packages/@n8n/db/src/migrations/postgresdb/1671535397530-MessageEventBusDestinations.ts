import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class MessageEventBusDestinations1671535397530 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}event_destinations (` +
				'"id" UUID PRIMARY KEY NOT NULL,' +
				'"destination" JSONB NOT NULL,' +
				'"createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'"updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}event_destinations"`);
	}
}
