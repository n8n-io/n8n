import { LDAP_FEATURE_NAME, LDAP_DEFAULT_CONFIGURATION } from '@n8n/constants';

import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateLdapEntities1674509946020 implements ReversibleMigration {
	async up({ escape, dbType, isMysql, runQuery }: MigrationContext) {
		const userTable = escape.tableName('user');
		await runQuery(`ALTER TABLE ${userTable} ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT false;`);

		await runQuery(`
			INSERT INTO ${escape.tableName('settings')}
			(${escape.columnName('key')}, value, ${escape.columnName('loadOnStartup')})
			VALUES ('${LDAP_FEATURE_NAME}', '${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}', true)
		`);

		const uuidColumnType = dbType === 'postgresdb' ? 'UUID' : 'VARCHAR(36)';

		await runQuery(
			`CREATE TABLE IF NOT EXISTS ${escape.tableName('auth_identity')} (
				${escape.columnName('userId')} ${uuidColumnType} REFERENCES ${userTable} (id),
				${escape.columnName('providerId')} VARCHAR(64) NOT NULL,
				${escape.columnName('providerType')} VARCHAR(32) NOT NULL,
				${escape.columnName('createdAt')} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				${escape.columnName('updatedAt')} timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(${escape.columnName('providerId')}, ${escape.columnName('providerType')})
			)${isMysql ? "ENGINE='InnoDB'" : ''}`,
		);

		const idColumn =
			dbType === 'sqlite'
				? 'INTEGER PRIMARY KEY AUTOINCREMENT'
				: dbType === 'postgresdb'
					? 'SERIAL NOT NULL PRIMARY KEY'
					: 'INTEGER NOT NULL AUTO_INCREMENT';

		const timestampColumn =
			dbType === 'sqlite'
				? 'DATETIME NOT NULL'
				: dbType === 'postgresdb'
					? 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'
					: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';

		await runQuery(
			`CREATE TABLE IF NOT EXISTS ${escape.tableName('auth_provider_sync_history')} (
				${escape.columnName('id')} ${idColumn},
				${escape.columnName('providerType')} VARCHAR(32) NOT NULL,
				${escape.columnName('runMode')} TEXT NOT NULL,
				${escape.columnName('status')} TEXT NOT NULL,
				${escape.columnName('startedAt')} ${timestampColumn},
				${escape.columnName('endedAt')} ${timestampColumn},
				${escape.columnName('scanned')} INTEGER NOT NULL,
				${escape.columnName('created')} INTEGER NOT NULL,
				${escape.columnName('updated')} INTEGER NOT NULL,
				${escape.columnName('disabled')} INTEGER NOT NULL,
				${escape.columnName('error')} TEXT
				${isMysql ? ',PRIMARY KEY (`id`)' : ''}
			)${isMysql ? "ENGINE='InnoDB'" : ''}`,
		);
	}

	async down({ escape, runQuery }: MigrationContext) {
		await runQuery(`DROP TABLE "${escape.tableName('auth_provider_sync_history')}`);
		await runQuery(`DROP TABLE "${escape.tableName('auth_identity')}`);
		await runQuery(`DELETE FROM ${escape.tableName('settings')} WHERE key = :key`, {
			key: LDAP_FEATURE_NAME,
		});
		await runQuery(`ALTER TABLE ${escape.tableName('user')} DROP COLUMN disabled`);
	}
}
