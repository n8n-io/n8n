import { UserSettings } from 'n8n-core';
import { Connection, ConnectionOptions, createConnection, getConnection } from 'typeorm';

import config from '@/config';
import * as Db from '@/Db';
import { createCredentialsFromCredentialsEntity } from '@/CredentialsHelper';
import { entities } from '@db/entities';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { mysqlMigrations } from '@db/migrations/mysqldb';
import { postgresMigrations } from '@db/migrations/postgresdb';
import { sqliteMigrations } from '@db/migrations/sqlite';
import { hashPassword } from '@/UserManagement/UserManagementHelper';
import { DB_INITIALIZATION_TIMEOUT, MAPPING_TABLES, MAPPING_TABLES_TO_CLEAR } from './constants';
import {
	randomApiKey,
	randomCredentialPayload,
	randomEmail,
	randomName,
	randomString,
	randomValidPassword,
} from './random';
import { categorize, getPostgresSchemaSection } from './utils';

import { ExecutionEntity } from '@db/entities/ExecutionEntity';
import { InstalledNodes } from '@db/entities/InstalledNodes';
import { InstalledPackages } from '@db/entities/InstalledPackages';
import type { Role } from '@db/entities/Role';
import { TagEntity } from '@db/entities/TagEntity';
import { User } from '@db/entities/User';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import type {
	CollectionName,
	CredentialPayload,
	InstalledNodePayload,
	InstalledPackagePayload,
	MappingName,
} from './types';
import type { DatabaseType, ICredentialsDb } from '@/Interfaces';

export type TestDBType = 'postgres' | 'mysql';

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	jest.setTimeout(DB_INITIALIZATION_TIMEOUT);
	const dbType = config.getEnv('database.type');

	if (dbType === 'sqlite') {
		// no bootstrap connection required
		const testDbName = `n8n_test_sqlite_${randomString(6, 10)}_${Date.now()}`;
		await Db.init(getSqliteOptions({ name: testDbName }));
		await getConnection(testDbName).runMigrations({ transaction: 'none' });

		return { testDbName };
	}

	if (dbType === 'postgresdb') {
		let bootstrapPostgres;
		const pgOptions = getBootstrapDBOptions('postgres');

		try {
			bootstrapPostgres = await createConnection(pgOptions);
		} catch (error) {
			const pgConfig = getPostgresSchemaSection();

			if (!pgConfig) throw new Error("Failed to find config schema section for 'postgresdb'");

			const message = [
				"ERROR: Failed to connect to Postgres default DB 'postgres'",
				'Please review your Postgres connection options:',
				`host: ${pgOptions.host} | port: ${pgOptions.port} | schema: ${pgOptions.schema} | username: ${pgOptions.username} | password: ${pgOptions.password}`,
				'Fix by setting correct values via environment variables:',
				`${pgConfig.host.env} | ${pgConfig.port.env} | ${pgConfig.schema.env} | ${pgConfig.user.env} | ${pgConfig.password.env}`,
				'Otherwise, make sure your Postgres server is running.',
			].join('\n');

			console.error(message);

			process.exit(1);
		}

		const testDbName = `postgres_${randomString(6, 10)}_${Date.now()}_n8n_test`;
		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.close();

		const dbOptions = getDBOptions('postgres', testDbName);

		if (dbOptions.schema !== 'public') {
			const { schema, migrations, ...options } = dbOptions;
			const connection = await createConnection(options);
			await connection.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
			await connection.close();
		}

		await Db.init(dbOptions);

		return { testDbName };
	}

	if (dbType === 'mysqldb') {
		const bootstrapMysql = await createConnection(getBootstrapDBOptions('mysql'));

		const testDbName = `mysql_${randomString(6, 10)}_${Date.now()}_n8n_test`;
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapMysql.close();

		await Db.init(getDBOptions('mysql', testDbName));

		return { testDbName };
	}

	throw new Error(`Unrecognized DB type: ${dbType}`);
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate(testDbName: string) {
	await getConnection(testDbName).close();
}

async function truncateMappingTables(
	dbType: DatabaseType,
	collections: Array<CollectionName>,
	testDb: Connection,
) {
	const mappingTables = collections.reduce<string[]>((acc, collection) => {
		const found = MAPPING_TABLES_TO_CLEAR[collection];

		if (found) acc.push(...found);

		return acc;
	}, []);

	if (dbType === 'sqlite') {
		const promises = mappingTables.map((tableName) =>
			testDb.query(
				`DELETE FROM ${tableName}; DELETE FROM sqlite_sequence WHERE name=${tableName};`,
			),
		);

		return Promise.all(promises);
	}

	if (dbType === 'postgresdb') {
		const schema = config.getEnv('database.postgresdb.schema');

		// sequential TRUNCATEs to prevent race conditions
		for (const tableName of mappingTables) {
			const fullTableName = `${schema}.${tableName}`;
			await testDb.query(`TRUNCATE TABLE ${fullTableName} RESTART IDENTITY CASCADE;`);
		}

		return Promise.resolve([]);
	}

	// mysqldb, mariadb

	const promises = mappingTables.flatMap((tableName) => [
		testDb.query(`DELETE FROM ${tableName};`),
		testDb.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1;`),
	]);

	return Promise.all(promises);
}

/**
 * Truncate specific DB tables in a test DB.
 *
 * @param collections Array of entity names whose tables to truncate.
 * @param testDbName Name of the test DB to truncate tables in.
 */
export async function truncate(collections: Array<CollectionName>, testDbName: string) {
	const dbType = config.getEnv('database.type');
	const testDb = getConnection(testDbName);

	if (dbType === 'sqlite') {
		await testDb.query('PRAGMA foreign_keys=OFF');

		const truncationPromises = collections.map((collection) => {
			const tableName = toTableName(collection);
			Db.collections[collection].clear();
			return testDb.query(
				`DELETE FROM ${tableName}; DELETE FROM sqlite_sequence WHERE name=${tableName};`,
			);
		});

		truncationPromises.push(truncateMappingTables(dbType, collections, testDb));

		await Promise.all(truncationPromises);

		return testDb.query('PRAGMA foreign_keys=ON');
	}

	if (dbType === 'postgresdb') {
		const schema = config.getEnv('database.postgresdb.schema');

		// sequential TRUNCATEs to prevent race conditions
		for (const collection of collections) {
			const fullTableName = `${schema}.${toTableName(collection)}`;
			await testDb.query(`TRUNCATE TABLE ${fullTableName} RESTART IDENTITY CASCADE;`);
		}

		return truncateMappingTables(dbType, collections, testDb);
	}

	if (dbType === 'mysqldb') {
		const { pass: sharedTables, fail: rest } = categorize(collections, (c: CollectionName) =>
			c.toLowerCase().startsWith('shared'),
		);

		// sequential DELETEs to prevent race conditions
		// clear foreign-key tables first to avoid deadlocks on MySQL: https://stackoverflow.com/a/41174997
		for (const collection of [...sharedTables, ...rest]) {
			const tableName = toTableName(collection);

			await testDb.query(`DELETE FROM ${tableName};`);

			const hasIdColumn = await testDb
				.query(`SHOW COLUMNS FROM ${tableName}`)
				.then((columns: { Field: string }[]) => columns.find((c) => c.Field === 'id'));

			if (!hasIdColumn) continue;

			await testDb.query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1;`);
		}

		return truncateMappingTables(dbType, collections, testDb);
	}
}

const isMapping = (collection: string): collection is MappingName =>
	Object.keys(MAPPING_TABLES).includes(collection);

function toTableName(sourceName: CollectionName | MappingName) {
	if (isMapping(sourceName)) return MAPPING_TABLES[sourceName];

	return {
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
		InstalledPackages: 'installed_packages',
		InstalledNodes: 'installed_nodes',
		WorkflowStatistics: 'workflow_statistics',
	}[sourceName];
}

// ----------------------------------
//        credential creation
// ----------------------------------

/**
 * Save a credential to the test DB, sharing it with a user.
 */
export async function saveCredential(
	credentialPayload: CredentialPayload = randomCredentialPayload(),
	{ user, role }: { user: User; role: Role },
) {
	const newCredential = new CredentialsEntity();

	Object.assign(newCredential, credentialPayload);

	const encryptedData = await encryptCredentialData(newCredential);

	Object.assign(newCredential, encryptedData);

	const savedCredential = await Db.collections.Credentials.save(newCredential);

	savedCredential.data = newCredential.data;

	await Db.collections.SharedCredentials.save({
		user,
		credentials: savedCredential,
		role,
	});

	return savedCredential;
}

export async function shareCredentialWithUsers(credential: CredentialsEntity, users: User[]) {
	const role = await Db.collections.Role.findOne({ scope: 'credential', name: 'user' });
	const newSharedCredentials = users.map((user) =>
		Db.collections.SharedCredentials.create({
			user,
			credentials: credential,
			role,
		}),
	);
	return Db.collections.SharedCredentials.save(newSharedCredentials);
}

export function affixRoleToSaveCredential(role: Role) {
	return (credentialPayload: CredentialPayload, { user }: { user: User }) =>
		saveCredential(credentialPayload, { user, role });
}

// ----------------------------------
//           user creation
// ----------------------------------

/**
 * Store a user in the DB, defaulting to a `member`.
 */
export async function createUser(attributes: Partial<User> = {}): Promise<User> {
	const { email, password, firstName, lastName, globalRole, ...rest } = attributes;
	const user = {
		email: email ?? randomEmail(),
		password: await hashPassword(password ?? randomValidPassword()),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		globalRole: globalRole ?? (await getGlobalMemberRole()),
		...rest,
	};

	return Db.collections.User.save(user);
}

export async function createOwner() {
	return createUser({ globalRole: await getGlobalOwnerRole() });
}

export function createUserShell(globalRole: Role): Promise<User> {
	if (globalRole.scope !== 'global') {
		throw new Error(`Invalid role received: ${JSON.stringify(globalRole)}`);
	}

	const shell: Partial<User> = { globalRole };

	if (globalRole.name !== 'owner') {
		shell.email = randomEmail();
	}

	return Db.collections.User.save(shell);
}

/**
 * Create many users in the DB, defaulting to a `member`.
 */
export async function createManyUsers(
	amount: number,
	attributes: Partial<User> = {},
): Promise<User[]> {
	let { email, password, firstName, lastName, globalRole, ...rest } = attributes;
	if (!globalRole) {
		globalRole = await getGlobalMemberRole();
	}

	const users = await Promise.all(
		[...Array(amount)].map(async () =>
			Db.collections.User.create({
				email: email ?? randomEmail(),
				password: await hashPassword(password ?? randomValidPassword()),
				firstName: firstName ?? randomName(),
				lastName: lastName ?? randomName(),
				globalRole,
				...rest,
			}),
		),
	);

	return Db.collections.User.save(users);
}

// --------------------------------------
// Installed nodes and packages creation
// --------------------------------------

export async function saveInstalledPackage(
	installedPackagePayload: InstalledPackagePayload,
): Promise<InstalledPackages> {
	const newInstalledPackage = new InstalledPackages();

	Object.assign(newInstalledPackage, installedPackagePayload);

	const savedInstalledPackage = await Db.collections.InstalledPackages.save(newInstalledPackage);
	return savedInstalledPackage;
}

export function saveInstalledNode(
	installedNodePayload: InstalledNodePayload,
): Promise<InstalledNodes> {
	const newInstalledNode = new InstalledNodes();

	Object.assign(newInstalledNode, installedNodePayload);

	return Db.collections.InstalledNodes.save(newInstalledNode);
}

export function addApiKey(user: User): Promise<User> {
	user.apiKey = randomApiKey();
	return Db.collections.User.save(user);
}

// ----------------------------------
//          role fetchers
// ----------------------------------

export function getGlobalOwnerRole() {
	return Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'global',
	});
}

export function getGlobalMemberRole() {
	return Db.collections.Role.findOneOrFail({
		name: 'member',
		scope: 'global',
	});
}

export function getWorkflowOwnerRole() {
	return Db.collections.Role.findOneOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}

export function getWorkflowEditorRole() {
	return Db.collections.Role.findOneOrFail({
		name: 'editor',
		scope: 'workflow',
	});
}

export function getCredentialOwnerRole() {
	return Db.collections.Role.findOneOrFail({
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
//          Execution helpers
// ----------------------------------

export async function createManyExecutions(
	amount: number,
	workflow: WorkflowEntity,
	callback: (workflow: WorkflowEntity) => Promise<ExecutionEntity>,
) {
	const executionsRequests = [...Array(amount)].map((_) => callback(workflow));
	return Promise.all(executionsRequests);
}

/**
 * Store a execution in the DB and assign it to a workflow.
 */
export async function createExecution(
	attributes: Partial<ExecutionEntity> = {},
	workflow: WorkflowEntity,
) {
	const { data, finished, mode, startedAt, stoppedAt, waitTill } = attributes;

	const execution = await Db.collections.Execution.save({
		data: data ?? '[]',
		finished: finished ?? true,
		mode: mode ?? 'manual',
		startedAt: startedAt ?? new Date(),
		...(workflow !== undefined && { workflowData: workflow, workflowId: workflow.id.toString() }),
		stoppedAt: stoppedAt ?? new Date(),
		waitTill: waitTill ?? null,
	});

	return execution;
}

/**
 * Store a successful execution in the DB and assign it to a workflow.
 */
export async function createSuccessfulExecution(workflow: WorkflowEntity) {
	return await createExecution(
		{
			finished: true,
		},
		workflow,
	);
}

/**
 * Store an error execution in the DB and assign it to a workflow.
 */
export async function createErrorExecution(workflow: WorkflowEntity) {
	return await createExecution(
		{
			finished: false,
			stoppedAt: new Date(),
		},
		workflow,
	);
}

/**
 * Store a waiting execution in the DB and assign it to a workflow.
 */
export async function createWaitingExecution(workflow: WorkflowEntity) {
	return await createExecution(
		{
			finished: false,
			waitTill: new Date(),
		},
		workflow,
	);
}

// ----------------------------------
//          Tags
// ----------------------------------

export async function createTag(attributes: Partial<TagEntity> = {}) {
	const { name } = attributes;

	return await Db.collections.Tag.save({
		name: name ?? randomName(),
		...attributes,
	});
}

// ----------------------------------
//          Workflow helpers
// ----------------------------------

export async function createManyWorkflows(
	amount: number,
	attributes: Partial<WorkflowEntity> = {},
	user?: User,
) {
	const workflowRequests = [...Array(amount)].map((_) => createWorkflow(attributes, user));
	return Promise.all(workflowRequests);
}

/**
 * Store a workflow in the DB (without a trigger) and optionally assign it to a user.
 * @param user user to assign the workflow to
 */
export async function createWorkflow(attributes: Partial<WorkflowEntity> = {}, user?: User) {
	const { active, name, nodes, connections } = attributes;

	const workflow = await Db.collections.Workflow.save({
		active: active ?? false,
		name: name ?? 'test workflow',
		nodes: nodes ?? [
			{
				id: 'uuid-1234',
				name: 'Start',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
			},
		],
		connections: connections ?? {},
		...attributes,
	});

	if (user) {
		await Db.collections.SharedWorkflow.save({
			user,
			workflow,
			role: await getWorkflowOwnerRole(),
		});
	}
	return workflow;
}

export async function shareWorkflowWithUsers(workflow: WorkflowEntity, users: User[]) {
	const role = await getWorkflowEditorRole();
	const sharedWorkflows = users.map((user) => ({
		user,
		workflow,
		role,
	}));
	return Db.collections.SharedWorkflow.save(sharedWorkflows);
}

/**
 * Store a workflow in the DB (with a trigger) and optionally assign it to a user.
 * @param user user to assign the workflow to
 */
export async function createWorkflowWithTrigger(
	attributes: Partial<WorkflowEntity> = {},
	user?: User,
) {
	const workflow = await createWorkflow(
		{
			nodes: [
				{
					id: 'uuid-1',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-2',
					parameters: { triggerTimes: { item: [{ mode: 'everyMinute' }] } },
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [500, 300],
				},
				{
					id: 'uuid-3',
					parameters: { options: {} },
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [780, 300],
				},
			],
			connections: { Cron: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
			...attributes,
		},
		user,
	);

	return workflow;
}

// ----------------------------------
//        workflow sharing
// ----------------------------------

export async function getWorkflowSharing(workflow: WorkflowEntity) {
	return Db.collections.SharedWorkflow.find({
		where: {
			workflow,
		},
	});
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

const baseOptions = (type: TestDBType) => ({
	host: config.getEnv(`database.${type}db.host`),
	port: config.getEnv(`database.${type}db.port`),
	username: config.getEnv(`database.${type}db.user`),
	password: config.getEnv(`database.${type}db.password`),
	schema: type === 'postgres' ? config.getEnv(`database.postgresdb.schema`) : undefined,
});

/**
 * Generate options for a bootstrap DB connection, to create and drop test databases.
 */
export const getBootstrapDBOptions = (type: TestDBType) =>
	({
		type,
		name: type,
		database: type,
		...baseOptions(type),
	} as const);

const getDBOptions = (type: TestDBType, name: string) => ({
	type,
	name,
	database: name,
	...baseOptions(type),
	dropSchema: true,
	migrations: type === 'postgres' ? postgresMigrations : mysqlMigrations,
	migrationsRun: true,
	migrationsTableName: 'migrations',
	entities: Object.values(entities),
	synchronize: false,
	logging: false,
});

// ----------------------------------
//            encryption
// ----------------------------------

async function encryptCredentialData(credential: CredentialsEntity) {
	const encryptionKey = await UserSettings.getEncryptionKey();

	const coreCredential = createCredentialsFromCredentialsEntity(credential, true);

	// @ts-ignore
	coreCredential.setData(credential.data, encryptionKey);

	return coreCredential.getDataToSave() as ICredentialsDb;
}
