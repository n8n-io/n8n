import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AUTH_IDENTITY_TABLE = 'auth_identity';
const STATUS_COLUMN = 'status';
const STATUSES = ['active', 'suspended', 'revoked'];

export class AddStatusToAuthIdentity1785930000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, addEnumCheck, column } }: MigrationContext) {
		await addColumns(
			AUTH_IDENTITY_TABLE,
			[column(STATUS_COLUMN).varchar(32).notNull.default("'active'")],
			{ recreatesOnSqlite: true },
		);
		await addEnumCheck(AUTH_IDENTITY_TABLE, STATUS_COLUMN, STATUSES, {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder: { dropEnumCheck, dropColumns } }: MigrationContext) {
		await dropEnumCheck(AUTH_IDENTITY_TABLE, STATUS_COLUMN, { recreatesOnSqlite: true });
		await dropColumns(AUTH_IDENTITY_TABLE, [STATUS_COLUMN], { recreatesOnSqlite: true });
	}
}
