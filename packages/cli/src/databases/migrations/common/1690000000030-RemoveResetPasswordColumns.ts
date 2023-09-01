import type { MigrationContext, ReversibleMigration } from '@db/types';

export class RemoveResetPasswordColumns1690000000030 implements ReversibleMigration {
	async up({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('user', ['resetPasswordToken', 'resetPasswordTokenExpiration']);
	}

	async down({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('user', [
			column('resetPasswordToken').varchar(),
			column('resetPasswordTokenExpiration').int,
		]);
	}
}
