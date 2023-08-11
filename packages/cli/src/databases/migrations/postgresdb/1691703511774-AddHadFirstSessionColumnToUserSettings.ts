import type { MigrationContext, ReversibleMigration } from '@db/types';
import type { UserSettings } from '@/Interfaces';

export class AddHadFirstSessionColumnToUserSettings1691703511774 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const usersWithoutSessions = (await queryRunner.query(
			`SELECT id,
				JSONB_SET(COALESCE(u.settings::jsonb, '{}'), '{hadFirstSession}', 'false', true)
				FROM  ${tablePrefix}user
				WHERE email is NULL`,
		)) as UserSettings[];

		const updatedUsers = usersWithoutSessions.map(async (user) =>
			queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = '${JSON.stringify(
					user.settings,
				)}' WHERE id = '${user.id}' `,
			),
		);

		await Promise.all(updatedUsers);

		if (!usersWithoutSessions.length) {
			await queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = JSONB_SET(COALESCE(settings::jsonb, '{}'), '{hadFirstSession}', 'true', true)`,
			);
		} else {
			const usersWithoutSessionsIds = usersWithoutSessions.map((user) => `'${user.id}'`).join(',');

			await queryRunner.query(
				`UPDATE "${tablePrefix}user" SET settings = JSONB_SET(COALESCE(settings::jsonb, '{}'), '{hadFirstSession}', 'true', true) WHERE id NOT IN (${usersWithoutSessionsIds})`,
			);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE "${tablePrefix}user" SET settings = settings::jsonb - 'hadFirstSession'`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}user" SET settings = NULL WHERE settings::jsonb = '{}'::jsonb`,
		);
	}
}
