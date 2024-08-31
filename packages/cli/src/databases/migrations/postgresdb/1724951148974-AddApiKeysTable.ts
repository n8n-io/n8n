import type { MigrationContext } from '@/databases/types';

export class AddApiKeysTable1724951148974 {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}user_api_keys`;

		// Create the table
		await queryRunner.query(`
			CREATE TABLE ${tableName} (
				"id" VARCHAR(36) PRIMARY KEY,
				"userId" UUID NOT NULL,
				"label" VARCHAR(255) NOT NULL,
				"apiKey" VARCHAR NOT NULL,
				"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
				"updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
				FOREIGN KEY ("userId") REFERENCES "${tablePrefix}user"("id"),
				UNIQUE ("userId", label),
				UNIQUE("apiKey")
			);
		`);

		// Move the apiKey from the users table to the new table
		await queryRunner.query(`
			INSERT INTO ${tableName} ("userId", "apiKey", label)
			SELECT id, "apiKey", 'My API Key' FROM "${tablePrefix}user" WHERE "apiKey" IS NOT NULL;
		`);

		//  Drop apiKey column on user's table
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "apiKey";`);
	}
}
