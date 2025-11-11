import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * PostgreSQL-specific migration to change the default value for the `id` column in `user` table.
 * The previous default implementation was based on MD5 hashing to produce a random UUID, but
 * MD5 is not supported in FIPS compliant postgres environments. SHA256 is used instead.
 *
 * An easier approach would be to use the `gen_random_uuid()` function provided by PostgreSQL, but
 * it is not supported in versions of PostgreSQL lower than 13. Therefore, we use the `uuid_in()` function
 * with a SHA256 hash of a random string and the current timestamp.
 */
export class ChangeDefaultForIdInUserTable1762771264000 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const tableName = escape.tableName('user');
		const idColumnName = escape.columnName('id');

		await queryRunner.query(
			`ALTER TABLE ${tableName} ALTER COLUMN ${idColumnName} SET DEFAULT uuid_in(overlay(overlay(left(encode(sha256((random()::text || ':' || clock_timestamp()::text)::bytea), 'hex'), 32) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring)`,
		);
	}
}
