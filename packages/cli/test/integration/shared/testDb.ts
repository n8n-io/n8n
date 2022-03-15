import { createConnection, getConnection, ConnectionOptions } from 'typeorm';
import { Credentials, UserSettings } from 'n8n-core';

import config = require('../../../config');
import { BOOTSTRAP_MYSQL_CONNECTION_NAME, BOOTSTRAP_POSTGRES_CONNECTION_NAME } from './constants';
import { DatabaseType, Db, ICredentialsDb, IDatabaseCollections } from '../../../src';
import { randomEmail, randomName, randomString, randomValidPassword } from './random';
import { CredentialsEntity } from '../../../src/databases/entities/CredentialsEntity';

import { RESPONSE_ERROR_MESSAGES } from '../../../src/constants';
import { entities } from '../../../src/databases/entities';
import { mysqlMigrations } from '../../../src/databases/mysqldb/migrations';
import { postgresMigrations } from '../../../src/databases/postgresdb/migrations';
import { sqliteMigrations } from '../../../src/databases/sqlite/migrations';

import type { Role } from '../../../src/databases/entities/Role';
import type { User } from '../../../src/databases/entities/User';
import type { CredentialPayload } from './types';

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	const dbType = config.get('database.type') as DatabaseType;

	if (dbType === 'sqlite') {
		// no bootstrap connection required
		const testDbName = `n8n_test_sqlite_${randomString(6, 10)}_${Date.now()}`;
		await Db.init(getSqliteOptions({ name: testDbName }));
		await getConnection(testDbName).runMigrations({ transaction: 'none' });

		return { testDbName };
	}

	if (dbType === 'postgresdb') {
		let bootstrapPostgres;
		const bootstrapPostgresOptions = getBootstrapPostgresOptions();

		try {
			bootstrapPostgres = await createConnection(bootstrapPostgresOptions);
		} catch (error) {
			const { username, password, host, port, schema } = bootstrapPostgresOptions;
			console.error(
				`ERROR: Failed to connect to Postgres default DB 'postgres'.\nPlease review your Postgres connection options:\n\thost: "${host}"\n\tusername: "${username}"\n\tpassword: "${password}"\n\tport: "${port}"\n\tschema: "${schema}"\nFix by setting correct values via environment variables:\n\texport DB_POSTGRESDB_HOST=value\n\texport DB_POSTGRESDB_USER=value\n\texport DB_POSTGRESDB_PASSWORD=value\n\texport DB_POSTGRESDB_PORT=value\n\texport DB_POSTGRESDB_SCHEMA=value`,
			);
			process.exit(1);
		}

		const testDbName = `pg_${randomString(6, 10)}_${Date.now()}_n8n_test`;
		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName};`);

		await Db.init(getPostgresOptions({ name: testDbName }));

		return { testDbName };
	}

	if (dbType === 'mysqldb') {
		const bootstrapMysql = await createConnection(getBootstrapMySqlOptions());

		const testDbName = `mysql_${randomString(6, 10)}_${Date.now()}_n8n_test`;
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName};`);

		await Db.init(getMySqlOptions({ name: testDbName }));

		return { testDbName };
	}

	throw new Error(`Unrecognized DB type: ${dbType}`);
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate(testDbName: string) {
	const dbType = config.get('database.type') as DatabaseType;

	if (dbType === 'sqlite') {
		await getConnection(testDbName).close();
	}

	if (dbType === 'postgresdb') {
		await getConnection(testDbName).close();

		const bootstrapPostgres = getConnection(BOOTSTRAP_POSTGRES_CONNECTION_NAME);
		await bootstrapPostgres.query(`DROP DATABASE ${testDbName}`);
		await bootstrapPostgres.close();
	}

	if (dbType === 'mysqldb') {
		await getConnection(testDbName).close();

		const bootstrapMySql = getConnection(BOOTSTRAP_MYSQL_CONNECTION_NAME);
		await bootstrapMySql.query(`DROP DATABASE ${testDbName}`);
		await bootstrapMySql.close();
	}
}

/**
 * Truncate DB tables for specified entities.
 *
 * @param entities Array of entity names whose tables to truncate.
 * @param testDbName Name of the test DB to truncate tables in.
 */
export async function truncate(entities: Array<keyof IDatabaseCollections>, testDbName: string) {
	const dbType = config.get('database.type');

	if (dbType === 'sqlite') {
		const testDb = getConnection(testDbName);
		await testDb.query('PRAGMA foreign_keys=OFF');
		await Promise.all(entities.map((entity) => Db.collections[entity]!.clear()));
		return testDb.query('PRAGMA foreign_keys=ON');
	}

	const map: { [K in keyof IDatabaseCollections]: string } = {
		Credentials: 'credentials_entity',
		Workflow: 'workflow_entity',
		Execution: 'execution_entity',
		Tag: 'tag_entity',
		Webhook: 'webhook_entity',
		Role: 'role',
		User: 'user',
		SharedCredentials: 'shared_credentials',
		SharedWorkflow: 'shared_workflow',
		Settings: 'settings',
	};

	if (dbType === 'postgresdb') {
		return Promise.all(
			entities.map((entity) =>
				getConnection(testDbName).query(
					`TRUNCATE TABLE "${map[entity]}" RESTART IDENTITY CASCADE;`,
				),
			),
		);
	}

	// MySQL truncation requires globals, which cannot be safely manipulated by parallel tests
	if (dbType === 'mysqldb') {
		await Promise.all(
			entities.map(async (entity) => {
				await Db.collections[entity]!.delete({});
				await getConnection(testDbName).query(`ALTER TABLE ${map[entity]} AUTO_INCREMENT = 1;`);
			}),
		);
	}
}

// ----------------------------------
//        credential creation
// ----------------------------------

/**
 * Save a credential to the test DB, sharing it with a user.
 */
export async function saveCredential(
	credentialPayload: CredentialPayload,
	{ user, role }: { user: User; role: Role },
) {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, credentialPayload);

	const encryptedData = await encryptCredentialData(newCredential);

	Object.assign(newCredential, encryptedData);

	const savedCredential = await Db.collections.Credentials!.save(newCredential);

	savedCredential.data = newCredential.data;

	await Db.collections.SharedCredentials!.save({
		user,
		credentials: savedCredential,
		role,
	});

	return savedCredential;
}

// ----------------------------------
//          user creation
// ----------------------------------

/**
 * Store a user in the DB, defaulting to a `member`.
 */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, globalRole, ...rest } = attributes;
	const user = {
		email: email ?? randomEmail(),
		password: password ?? randomValidPassword(),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		globalRole: globalRole ?? (await getGlobalMemberRole()),
		...rest,
	};

	return Db.collections.User!.save(user);
}

export async function createOwnerShell() {
	const globalRole = await getGlobalOwnerRole();
	return Db.collections.User!.save({ globalRole });
}

export async function createMemberShell() {
	const globalRole = await getGlobalMemberRole();
	return Db.collections.User!.save({ globalRole });
}

// ----------------------------------
//          role fetchers
// ----------------------------------

export async function getGlobalOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'global',
	});
}

export async function getGlobalMemberRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'member',
		scope: 'global',
	});
}

export async function getWorkflowOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}

export async function getCredentialOwnerRole() {
	return await Db.collections.Role!.findOneOrFail({
		name: 'owner',
		scope: 'credential',
	});
}

export function getAllRoles() {
	return Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
		getWorkflowOwnerRole(),
		getCredentialOwnerRole(),
	]);
}

// ----------------------------------
//        connection options
// ----------------------------------

/**
 * Generate options for an in-memory sqlite database connection,
 * one per test suite run.
 */
export const getSqliteOptions = ({ name }: { name: string }): ConnectionOptions => {
	return {
		name,
		type: 'sqlite',
		database: ':memory:',
		entityPrefix: '',
		dropSchema: true,
		migrations: sqliteMigrations,
		migrationsTableName: 'migrations',
		migrationsRun: false,
	};
};

/**
 * Generate options for a bootstrap Postgres connection,
 * to create and drop test Postgres databases.
 */
export const getBootstrapPostgresOptions = () => {
	const username = config.get('database.postgresdb.user');
	const password = config.get('database.postgresdb.password');
	const host = config.get('database.postgresdb.host');
	const port = config.get('database.postgresdb.port');
	const schema = config.get('database.postgresdb.schema');

	return {
		name: BOOTSTRAP_POSTGRES_CONNECTION_NAME,
		type: 'postgres',
		database: 'postgres', // pre-existing default database
		host,
		port,
		username,
		password,
		schema,
	} as const;
};

export const getPostgresOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.postgresdb.user');
	const password = config.get('database.postgresdb.password');
	const host = config.get('database.postgresdb.host');
	const port = config.get('database.postgresdb.port');
	const schema = config.get('database.postgresdb.schema');

	return {
		name,
		type: 'postgres',
		database: name,
		host,
		port,
		username,
		password,
		entityPrefix: '',
		schema,
		dropSchema: true,
		migrations: postgresMigrations,
		migrationsRun: true,
		migrationsTableName: 'migrations',
		entities: Object.values(entities),
		synchronize: false,
		logging: false,
	};
};

/**
 * Generate options for a bootstrap MySQL connection,
 * to create and drop test MySQL databases.
 */
export const getBootstrapMySqlOptions = (): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	return {
		name: BOOTSTRAP_MYSQL_CONNECTION_NAME,
		database: BOOTSTRAP_MYSQL_CONNECTION_NAME,
		type: 'mysql',
		host,
		port,
		username,
		password,
	};
};

/**
 * Generate options for a MySQL database connection,
 * one per test suite run.
 */
export const getMySqlOptions = ({ name }: { name: string }): ConnectionOptions => {
	const username = config.get('database.mysqldb.user');
	const password = config.get('database.mysqldb.password');
	const host = config.get('database.mysqldb.host');
	const port = config.get('database.mysqldb.port');

	return {
		name,
		database: name,
		type: 'mysql',
		host,
		port,
		username,
		password,
		migrations: mysqlMigrations,
		migrationsTableName: 'migrations',
		migrationsRun: true,
	};
};

// ----------------------------------
//            encryption
// ----------------------------------

async function encryptCredentialData(credential: CredentialsEntity) {
	const encryptionKey = await UserSettings.getEncryptionKey();

	if (!encryptionKey) {
		throw new Error(RESPONSE_ERROR_MESSAGES.NO_ENCRYPTION_KEY);
	}

	const coreCredential = new Credentials(
		{ id: null, name: credential.name },
		credential.type,
		credential.nodesAccess,
	);

	// @ts-ignore
	coreCredential.setData(credential.data, encryptionKey);

	return coreCredential.getDataToSave() as ICredentialsDb;
}
