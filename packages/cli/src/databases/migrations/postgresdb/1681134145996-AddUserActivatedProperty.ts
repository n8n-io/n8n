import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import type { UserSettings } from '@/Interfaces';

export class AddUserActivatedProperty1681134145996 implements MigrationInterface {
	name = 'AddUserActivatedProperty1681134145996';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		const activatedUsers: UserSettings[] = await queryRunner.query(
			`SELECT DISTINCT sw."userId" AS id,
				JSONB_SET(COALESCE(u.settings::jsonb, '{}'), '{userActivated}', 'true', true) as settings
			FROM  ${tablePrefix}workflow_statistics ws
						JOIN ${tablePrefix}shared_workflow sw
							ON ws."workflowId" = sw."workflowId"
						JOIN ${tablePrefix}role r
							ON r.id = sw."roleId"
						JOIN "${tablePrefix}user" u
							ON u.id = sw."userId"
			WHERE ws.name = 'production_success'
						AND r.name = 'owner'
						AND r.scope = 'workflow'`,
		);

		const updatedUsers = activatedUsers.map((user) =>
			queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = '${JSON.stringify(
					user.settings,
				)}' WHERE id = '${user.id}' `,
			),
		);

		await Promise.all(updatedUsers);

		if (!activatedUsers.length) {
			await queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = JSONB_SET(COALESCE(settings::jsonb, '{}'), '{userActivated}', 'false', true)`,
			);
		} else {
			const activatedUserIds = activatedUsers.map((user) => `'${user.id}'`).join(',');

			await queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = JSONB_SET(COALESCE(settings::jsonb, '{}'), '{userActivated}', 'false', true) WHERE id NOT IN (${activatedUserIds})`,
			);
		}

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`UPDATE "${tablePrefix}user" SET settings = settings::jsonb - 'userActivated'`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}user" SET settings = NULL WHERE settings::jsonb = '{}'::jsonb`,
		);
	}
}
