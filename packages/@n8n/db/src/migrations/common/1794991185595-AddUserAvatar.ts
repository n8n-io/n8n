import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Every source type the `binary_data` CHECK allows before this migration runs.
 * The CHECK is replaced as a whole, so a type missing here would be dropped.
 */
const sourceTypesBefore = [
	'execution',
	'chat_message_attachment',
	'agent_file',
	'agent_chat_attachment',
	'app_artifact',
];

/**
 * Lets users have a profile picture. The `user.avatar` JSON column records
 * which picture is shown (an upload, the one provided by SSO, or a generated
 * avatar) and where each picture's bytes live. In `db` storage mode the bytes
 * go into `binary_data` under the new `user_avatar` source type; in the other
 * modes they go to the configured byte store.
 *
 * The column is added and dropped with raw SQL, so SQLite never rebuilds
 * `user`. A rebuild drops the table, and with foreign keys on that fires the
 * CASCADE rules of every table that references `user`.
 */
export class AddUserAvatar1794991185595 implements ReversibleMigration {
	async up(ctx: MigrationContext) {
		const { escape, runQuery, isPostgres } = ctx;
		const table = escape.tableName('user');
		const avatar = escape.columnName('avatar');

		await runQuery(`ALTER TABLE ${table} ADD COLUMN ${avatar} ${isPostgres ? 'JSON' : 'TEXT'}`);
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${table}.${avatar} IS 'Profile picture: active source, backdrop, and storage references for each available picture'`,
			);
		}

		await this.replaceSourceTypeCheck(ctx, [...sourceTypesBefore, 'user_avatar']);
	}

	async down(ctx: MigrationContext) {
		const { escape, runQuery } = ctx;

		await runQuery(
			`DELETE FROM ${escape.tableName('binary_data')} WHERE ${escape.columnName('sourceType')} = 'user_avatar'`,
		);
		await this.replaceSourceTypeCheck(ctx, sourceTypesBefore);
		await runQuery(
			`ALTER TABLE ${escape.tableName('user')} DROP COLUMN ${escape.columnName('avatar')}`,
		);
	}

	private async replaceSourceTypeCheck(
		{
			schemaBuilder: { dropEnumCheck, addEnumCheck },
			isPostgres,
			runQuery,
			escape,
			tablePrefix,
		}: MigrationContext,
		values: string[],
	) {
		await dropEnumCheck('binary_data', 'sourceType', { recreatesOnSqlite: true });
		if (isPostgres) {
			const constraintName = escape.columnName(`CHK_${tablePrefix}binary_data_sourceType`);
			const allowedValues = values.map((value) => `'${value}'`).join(', ');
			// `NOT VALID` skips the scan of existing rows, which already satisfy the wider list.
			await runQuery(
				`ALTER TABLE ${escape.tableName('binary_data')} ADD CONSTRAINT ${constraintName} CHECK (${escape.columnName('sourceType')} IN (${allowedValues})) NOT VALID`,
			);
			return;
		}
		await addEnumCheck('binary_data', 'sourceType', values, { recreatesOnSqlite: true });
	}
}
