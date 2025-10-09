import type { IrreversibleMigration, MigrationContext } from '../migration-types';

export class RemoveSkipOwnerSetup1681134145997 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`DELETE FROM ${tablePrefix}settings WHERE \`key\` = 'userManagement.skipInstanceOwnerSetup';`,
		);
	}
}
