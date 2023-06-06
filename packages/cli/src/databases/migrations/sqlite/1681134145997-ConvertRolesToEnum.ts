import type { MigrationContext, ReversibleMigration } from '@db/types';

export class ConvertRolesToEnum1681134145996 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const roles = (await queryRunner.query(`
			SELECT role.id AS roleId, role.name || ":" || role.scope AS roleOption FROM role;
		`)) as Array<{ roleId: string; roleOption: string }>;

		const user = `\`${tablePrefix}user\``;
		const sharedWorkflow = `\`${tablePrefix}shared_workflow\``;
		const sharedCredentials = `\`${tablePrefix}shared_credentials\``;

		/**
		 * `user` table
		 */

		await queryRunner.query(`
			ALTER TABLE ${user} ADD COLUMN role varchar(32);
		`);

		for (const { roleId, roleOption } of roles) {
			await queryRunner.query(`
				UPDATE ${user} SET role = '${roleOption}' WHERE globalRoleId = '${roleId}';
			`);
		}

		/**
		 * `shared_workflow` table
		 */

		await queryRunner.query(`
			ALTER TABLE ${sharedWorkflow} ADD COLUMN role varchar(32);
		`);

		for (const { roleId, roleOption } of roles) {
			await queryRunner.query(`
				UPDATE ${sharedWorkflow} SET role = '${roleOption}' WHERE roleId = '${roleId}';
			`);
		}

		/**
		 * `shared_credentials` table
		 */

		await queryRunner.query(`
			ALTER TABLE ${sharedCredentials} ADD COLUMN role varchar(32);
		`);

		for (const { roleId, roleOption } of roles) {
			await queryRunner.query(`
				UPDATE ${sharedCredentials} SET role = '${roleOption}' WHERE roleId = '${roleId}';
			`);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		const user = `\`${tablePrefix}user\``;
		const sharedWorkflow = `\`${tablePrefix}shared_workflow\``;
		const sharedCredentials = `\`${tablePrefix}shared_credentials\``;

		await queryRunner.query(`ALTER TABLE ${user} DROP COLUMN role`);
		await queryRunner.query(`ALTER TABLE ${sharedWorkflow} DROP COLUMN role`);
		await queryRunner.query(`ALTER TABLE ${sharedCredentials} DROP COLUMN "role"`);
	}
}
