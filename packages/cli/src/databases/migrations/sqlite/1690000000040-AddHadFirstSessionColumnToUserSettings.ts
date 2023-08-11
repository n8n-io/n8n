import type { MigrationContext, ReversibleMigration } from '@db/types';
import type { UserSettings } from '@/Interfaces';

export class AddHadFirstSessionColumnToUserSettings1690000000040 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const usersWithoutSessions = (await queryRunner.query(
			`SELECT id,
				JSON_SET(COALESCE(u.settings, '{}'), '$.hadFirstSession', JSON('false'))
				FROM  ${tablePrefix}user
				WHERE email IS NULL`,
		)) as UserSettings[];

		const updatedUsers = usersWithoutSessions.map(async (user) =>
			queryRunner.query(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`UPDATE ${tablePrefix}user SET settings = '${user.settings}' WHERE id = '${user.id}' `,
			),
		);

		await Promise.all(updatedUsers);

		if (!updatedUsers.length) {
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.hadFirstSession', JSON('true'))`,
			);
		} else {
			const usersWithoutSessionsIds = usersWithoutSessions.map((user) => `'${user.id}'`).join(',');
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.hadFirstSession', JSON('true')) WHERE id NOT IN (${usersWithoutSessionsIds})`,
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
