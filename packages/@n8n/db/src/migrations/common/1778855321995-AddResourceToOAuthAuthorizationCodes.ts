import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const TABLE_NAME = 'oauth_authorization_codes';
const COLUMN_NAME = 'resource';

export class AddResourceToOAuthAuthorizationCodes1778855321995 implements IrreversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const hasResourceColumn = await queryRunner.hasColumn(TABLE_NAME, COLUMN_NAME);
		if (hasResourceColumn) {
			return;
		}

		const tableName = escape.tableName(TABLE_NAME);
		const columnName = escape.columnName(COLUMN_NAME);
		await queryRunner.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR;`);
	}
}
