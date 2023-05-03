import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import type { UserSettings } from '@/Interfaces';

export class AddUserActivatedProperty1681134145996 implements MigrationInterface {
	name = 'AddUserActivatedProperty1681134145996';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		const activatedUsers: UserSettings[] = await queryRunner.query(
			`SELECT DISTINCT sw.userId AS id,
				JSON_SET(COALESCE(u.settings, '{}'), '$.userActivated', true) AS settings
			FROM ${tablePrefix}workflow_statistics AS ws
						JOIN ${tablePrefix}shared_workflow as sw
							ON ws.workflowId = sw.workflowId
						JOIN ${tablePrefix}role AS r
							ON r.id = sw.roleId
						JOIN ${tablePrefix}user AS u
							ON u.id = sw.userId
			WHERE ws.name = 'production_success'
						AND r.name = 'owner'
						AND r.scope = 'workflow'`,
		);

		const updatedUsers = activatedUsers.map((user) => {
			/*
				MariaDB returns settings as a string and MySQL as a JSON
			*/
			const userSettings =
				typeof user.settings === 'string' ? user.settings : JSON.stringify(user.settings);
			queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = '${userSettings}' WHERE id = '${user.id}' `,
			);
		});

		await Promise.all(updatedUsers);

		if (!activatedUsers.length) {
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.userActivated', false)`,
			);
		} else {
			const activatedUserIds = activatedUsers.map((user) => `'${user.id}'`).join(',');

			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.userActivated', false) WHERE id NOT IN (${activatedUserIds})`,
			);
		}

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`UPDATE ${tablePrefix}user SET settings = JSON_REMOVE(settings, '$.userActivated')`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}user SET settings = NULL WHERE settings = '{}'`);
	}
}
