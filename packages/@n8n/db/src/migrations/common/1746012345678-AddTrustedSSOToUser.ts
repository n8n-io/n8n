import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTrustedSSOToUser1746012345678 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Add the trustedSSO column with default false
		const userTable = `${tablePrefix}user`;
		await queryRunner.query(`ALTER TABLE ${userTable} ADD COLUMN "trustedSSO" boolean NOT NULL DEFAULT false`);

		// Ensure email index exists (though it should already from the initial migration)
		// This is defensive in case the index was dropped
		const hasIndex = await queryRunner.query(
			`SELECT COUNT(*) as count FROM pg_indexes WHERE tablename = '${tablePrefix}user' AND indexname LIKE '%user_email%'`
		);

		if (hasIndex[0].count === '0') {
			await queryRunner.query(
				`CREATE UNIQUE INDEX "IDX_${tablePrefix}user_email" ON "${userTable}" ("email")`
			);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Remove the trustedSSO column
		await queryRunner.query(`ALTER TABLE ${tablePrefix}user DROP COLUMN "trustedSSO"`);
	}
}
