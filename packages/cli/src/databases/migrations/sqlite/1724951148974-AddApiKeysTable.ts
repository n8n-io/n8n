import type { MigrationContext } from '@/databases/types';

export class AddApiKeysTable1724951148974 {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const tableName = `${tablePrefix}user_api_keys`;

		// Create the table
		await queryRunner.query(`
			CREATE TABLE ${tableName} (
				id VARCHAR(36) PRIMARY KEY NOT NULL,
				"userId" VARCHAR NOT NULL,
				"label" VARCHAR(255) NOT NULL,
				"apiKey" VARCHAR NOT NULL,
				"createdAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"lastUsedAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				FOREIGN KEY ("userId") REFERENCES user(id),
				UNIQUE ("userId", label),
				UNIQUE("apiKey")
			);
		`);

		// Move the apiKey from the users table to the new table
		await queryRunner.query(`
			INSERT INTO ${tableName} ("userId", "apiKey", label)
			SELECT id, "apiKey", 'My API Key' FROM user WHERE "apiKey" IS NOT NULL;
		`);

		// Create temporary table to store the users dropping the api key column
		await queryRunner.query(`
				CREATE TABLE users_new (
					id varchar PRIMARY KEY,
					email VARCHAR(255) UNIQUE,
					"firstName" VARCHAR(32),
					"lastName" VARCHAR(32),
					password VARCHAR,
					"personalizationAnswers" TEXT,
					"createdAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
					"updatedAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
					settings TEXT,
					disabled BOOLEAN DEFAULT FALSE NOT NULL,
					"mfaEnabled" BOOLEAN DEFAULT FALSE NOT NULL,
					"mfaSecret" TEXT,
					"mfaRecoveryCodes" TEXT,
					role TEXT NOT NULL
			);
		`);

		//  Copy the data from the original users table
		await queryRunner.query(`
			INSERT INTO users_new ("id", "email", "firstName", "lastName", "password", "personalizationAnswers", "createdAt", "updatedAt", "settings", "disabled", "mfaEnabled", "mfaSecret", "mfaRecoveryCodes", "role")
			SELECT "id", "email", "firstName", "lastName", "password", "personalizationAnswers", "createdAt", "updatedAt", "settings", "disabled", "mfaEnabled", "mfaSecret", "mfaRecoveryCodes", "role"
			FROM user;
		`);

		// Drop table with apiKey column
		await queryRunner.query(`DROP TABLE user;`);

		// Rename the temporary table to users
		await queryRunner.query(`ALTER TABLE users_new RENAME TO user;`);
	}
}