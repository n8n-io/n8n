import type { UserSettings } from '../../entities/types-db';
import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddUserActivatedProperty1681134145996 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const activatedUsers = (await queryRunner.query(
			`SELECT DISTINCT sw.userId AS id,
				JSON_SET(COALESCE(u.settings, '{}'), '$.userActivated', JSON('true')) AS settings
			FROM  ${tablePrefix}workflow_statistics AS ws
						JOIN ${tablePrefix}shared_workflow AS sw
							ON ws.workflowId = sw.workflowId
						JOIN ${tablePrefix}role AS r
							ON r.id = sw.roleId
						JOIN ${tablePrefix}user AS u
							ON u.id = sw.userId
			WHERE ws.name = 'production_success'
						AND r.name = 'owner'
						AND r.scope = "workflow"`,
		)) as UserSettings[];

		const updatedUserPromises = activatedUsers.map(async (user) => {
			await queryRunner.query(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`UPDATE ${tablePrefix}user SET settings = '${user.settings}' WHERE id = '${user.id}' `,
			);
		});

		await Promise.all(updatedUserPromises);

		if (!activatedUsers.length) {
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.userActivated', JSON('false'))`,
			);
		} else {
			const activatedUserIds = activatedUsers.map((user) => `'${user.id}'`).join(',');
			await queryRunner.query(
				`UPDATE ${tablePrefix}user SET settings = JSON_SET(COALESCE(settings, '{}'), '$.userActivated', JSON('false')) WHERE id NOT IN (${activatedUserIds})`,
			);
		}
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${tablePrefix}user SET settings = JSON_REMOVE(settings, '$.userActivated')`,
		);
		await queryRunner.query(`UPDATE ${tablePrefix}user SET settings = NULL WHERE settings = '{}'`);
	}
}
