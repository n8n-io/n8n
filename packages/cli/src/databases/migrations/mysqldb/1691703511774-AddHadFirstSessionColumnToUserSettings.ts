import type { MigrationContext, ReversibleMigration } from '@db/types';
import type { UserSettings } from '@/Interfaces';

export class AddHadFirstSessionColumnToUserSettings1691703511774 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const usersWithoutSessions = (await queryRunner.query(
			`SELECT id,
				JSON_SET(COALESCE(u.settings, '{}'), '$.hadFirstSession', false)
				FROM ${tablePrefix}user
				WHERE email is NULL
				`,
		)) as UserSettings[];

		const updatedUsers = usersWithoutSessions.map(async (user) => {
			/*
				MariaDB returns settings as a string and MySQL as a JSON
			*/
			const userSettings =
				typeof user.settings === 'string' ? user.settings : JSON.stringify(user.settings);
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = '${userSettings}' WHERE id = '${user.id}' `,
			);
		});

		await Promise.all(updatedUsers);

		if (!usersWithoutSessions.length) {
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.hadFirstSession', true)`,
			);
		} else {
			const usersWithoutSessionsIds = usersWithoutSessions.map((user) => `'${user.id}'`).join(',');

			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.hadFirstSession', true) WHERE id NOT IN (${usersWithoutSessionsIds})`,
			);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${tablePrefix}user SET settings = JSON_REMOVE(settings, '$.hadFirstSession')`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}user SET settings = NULL WHERE settings = '{}'`);
	}
}
