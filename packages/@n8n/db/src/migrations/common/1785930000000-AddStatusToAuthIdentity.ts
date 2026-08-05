import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AUTH_IDENTITY_TABLE = 'auth_identity';
const STATUS_COLUMN = 'status';
const STATUSES = ['active', 'suspended', 'revoked'];

export class AddStatusToAuthIdentity1785930000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			AUTH_IDENTITY_TABLE,
			[
				column(STATUS_COLUMN)
					.varchar(32)
					.notNull.default("'active'")
					.withEnumCheck(STATUSES)
					.comment('Live authority gate for this binding: a non-active row resolves no principal'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropEnumCheck, dropColumns } }: MigrationContext) {
		// Must precede the column drop: SQLite carries the CHECK over to the
		// rebuilt table, where it would reference a column that no longer exists.
		await dropEnumCheck(AUTH_IDENTITY_TABLE, STATUS_COLUMN, { recreatesOnSqlite: true });
		await dropColumns(AUTH_IDENTITY_TABLE, [STATUS_COLUMN], { recreatesOnSqlite: true });
	}
}
