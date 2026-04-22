import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const TEMP_TABLE_NAME = 'temp_oauth_authorization_codes';

export class ChangeOAuthStateColumnToUnboundedVarchar1763572724000
	implements IrreversibleMigration
{
	async up({
		isSqlite,
		isPostgres,
		escape,
		copyTable,
		queryRunner,
		schemaBuilder: { createTable, column, dropTable },
	}: MigrationContext) {
		const tableName = escape.tableName(TABLE_NAME);

		if (isSqlite) {
			const tempTableName = escape.tableName(TEMP_TABLE_NAME);

			await createTable(TEMP_TABLE_NAME)
				.withColumns(
					column('code').varchar(255).primary.notNull,
					column('clientId').varchar().notNull,
					column('userId').uuid.notNull,
					column('redirectUri').varchar().notNull,
					column('codeChallenge').varchar().notNull,
					column('codeChallengeMethod').varchar(255).notNull,
					column('expiresAt').bigint.notNull.comment('Unix timestamp in milliseconds'),
					column('state').varchar(),
					column('used').bool.notNull.default(false),
				)
				.withForeignKey('clientId', {
					tableName: 'oauth_clients',
					columnName: 'id',
					onDelete: 'CASCADE',
				})
				.withForeignKey('userId', {
					tableName: 'user',
					columnName: 'id',
					onDelete: 'CASCADE',
				}).withTimestamps;

			await copyTable(TABLE_NAME, TEMP_TABLE_NAME);

			await dropTable(TABLE_NAME);

			await queryRunner.query(`ALTER TABLE ${tempTableName} RENAME TO ${tableName};`);
		} else if (isPostgres) {
			await queryRunner.query(
				`ALTER TABLE ${tableName} ALTER COLUMN ${escape.columnName('state')} TYPE VARCHAR,` +
					` ALTER COLUMN ${escape.columnName('codeChallenge')} TYPE VARCHAR,` +
					` ALTER COLUMN ${escape.columnName('redirectUri')} TYPE VARCHAR;`,
			);
		}
	}
}
