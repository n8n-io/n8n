import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreatePasskeysEntity1714824960714 implements ReversibleMigration {
	async up(context: MigrationContext): Promise<void> {
		const { queryRunner, tablePrefix } = context;

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}passkeys\` (
				"id" TEXT NOT NULL,
				"publicKey" BLOB NOT NULL,
				"userId" TEXT NOT NULL,
				"counter" BIGINT NOT NULL,
				"deviceType" VARCHAR(32) NOT NULL,
				"backedUp" BOOLEAN NOT NULL,
				"transports" TEXT NOT NULL,
				CONSTRAINT "FK_USER" FOREIGN KEY ("userId") REFERENCES "user"("id"),
				CONSTRAINT "UQ_WEB_AUTH_USER_ID_AND_ID" UNIQUE ("userId", "id")
			);
			CREATE INDEX "IDX_WEB_AUTH_USER_ID" ON "passkey"("userId");`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {}
}
