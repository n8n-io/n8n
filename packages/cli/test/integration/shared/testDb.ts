import { UserSettings } from 'n8n-core';
import { DataSource as Connection, DataSourceOptions as ConnectionOptions } from 'typeorm';

import config from '@/config';
import * as Db from '@/Db';
import { createCredentialsFromCredentialsEntity } from '@/CredentialsHelper';
import { entities } from '@db/entities';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { mysqlMigrations } from '@db/migrations/mysqldb';
import { postgresMigrations } from '@db/migrations/postgresdb';
import { sqliteMigrations } from '@db/migrations/sqlite';
import { hashPassword } from '@/UserManagement/UserManagementHelper';
import { AuthIdentity } from '@/databases/entities/AuthIdentity';
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
import { DB_INITIALIZATION_TIMEOUT, MAPPING_TABLES, MAPPING_TABLES_TO_CLEAR } from './constants';
import { randomApiKey, randomEmail, randomName, randomString, randomValidPassword } from './random';
import { categorize, getPostgresSchemaSection } from './utils';

import type { DatabaseType, ICredentialsDb } from '@/Interfaces';

export type TestDBType = 'postgres' | 'mysql';

/**
 * Initialize one test DB per suite run, with bootstrap connection if needed.
 */
export async function init() {
	jest.setTimeout(DB_INITIALIZATION_TIMEOUT);
	const dbType = config.getEnv('database.type');
	const testDbName = `n8n_test_${randomString(6, 10)}_${Date.now()}`;

	if (dbType === 'sqlite') {
		// no bootstrap connection required
		return Db.init(getSqliteOptions({ name: testDbName }));
	}

	if (dbType === 'postgresdb') {
		let bootstrapPostgres;
		const pgOptions = getBootstrapDBOptions('postgres');

		try {
			bootstrapPostgres = await new Connection(pgOptions).initialize();
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

		await bootstrapPostgres.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapPostgres.destroy();

		return Db.init(getDBOptions('postgres', testDbName));
	}

	if (dbType === 'mysqldb') {
		const bootstrapMysql = await new Connection(getBootstrapDBOptions('mysql')).initialize();
		await bootstrapMysql.query(`CREATE DATABASE ${testDbName}`);
		await bootstrapMysql.destroy();

		return Db.init(getDBOptions('mysql', testDbName));
	}

	throw new Error(`Unrecognized DB type: ${dbType}`);
}

/**
 * Drop test DB, closing bootstrap connection if existing.
 */
export async function terminate() {
	await Db.getConnection().destroy();
}

async function truncateMappingTables(
	dbType: DatabaseType,
	collections: CollectionName[],
	testDb: Connection,
) {
	const mappingTables = collections.reduce<string[]>((acc, collection) => {
		const found = MAPPING_TABLES_TO_CLEAR[collection];

		if (found) acc.push(...found);

		return acc;
	}, []);

	if (dbType === 'sqlite') {
		const promises = mappingTables.map(async (tableName) =>
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
export async function truncate(collections: CollectionName[]) {
	const dbType = config.getEnv('database.type');
	const testDb = Db.getConnection();

	if (dbType === 'sqlite') {
		await testDb.query('PRAGMA foreign_keys=OFF');

		const truncationPromises = collections.map(async (collection) => {
			const tableName = toTableName(collection);
			// Db.collections[collection].clear();
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
				.then((columns: Array<{ Field: string }>) => columns.find((c) => c.Field === 'id'));

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
		AuthIdentity: 'auth_identity',
		AuthProviderSyncHistory: 'auth_provider_sync_history',
		Credentials: 'credentials_entity',
		Execution: 'execution_entity',
		InstalledNodes: 'installed_nodes',
		InstalledPackages: 'installed_packages',
		Role: 'role',
		Settings: 'settings',
		SharedCredentials: 'shared_credentials',
		SharedWorkflow: 'shared_workflow',
		Tag: 'tag_entity',
		User: 'user',
		Webhook: 'webhook_entity',
		Workflow: 'workflow_entity',
		WorkflowStatistics: 'workflow_statistics',
		EventDestinations: 'event_destinations',
	}[sourceName];
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
	const role = await Db.collections.Role.findOneBy({ scope: 'credential', name: 'user' });
	const newSharedCredentials = users.map((user) =>
		Db.collections.SharedCredentials.create({
			userId: user.id,
			credentialsId: credential.id,
			roleId: role?.id,
		}),
	);
	return Db.collections.SharedCredentials.save(newSharedCredentials);
}

export function affixRoleToSaveCredential(role: Role) {
	return async (credentialPayload: CredentialPayload, { user }: { user: User }) =>
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
	const user: Partial<User> = {
		email: email ?? randomEmail(),
		password: await hashPassword(password ?? randomValidPassword()),
		firstName: firstName ?? randomName(),
		lastName: lastName ?? randomName(),
		globalRole: globalRole ?? (await getGlobalMemberRole()),
		...rest,
	};

	return Db.collections.User.save(user);
}

export async function createLdapUser(attributes: Partial<User>, ldapId: string): Promise<User> {
	const user = await createUser(attributes);
	await Db.collections.AuthIdentity.save(AuthIdentity.create(user, ldapId, 'ldap'));
	return user;
}

export async function createOwner() {
	return createUser({ globalRole: await getGlobalOwnerRole() });
}

export async function createUserShell(globalRole: Role): Promise<User> {
	if (globalRole.scope !== 'global') {
		throw new Error(`Invalid role received: ${JSON.stringify(globalRole)}`);
	}

	const shell: Partial<User> = { globalRoleId: globalRole.id };

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

export async function saveInstalledNode(
	installedNodePayload: InstalledNodePayload,
): Promise<InstalledNodes> {
	const newInstalledNode = new InstalledNodes();

	Object.assign(newInstalledNode, installedNodePayload);

	return Db.collections.InstalledNodes.save(newInstalledNode);
}

export async function addApiKey(user: User): Promise<User> {
	user.apiKey = randomApiKey();
	return Db.collections.User.save(user);
}

// ----------------------------------
//          role fetchers
// ----------------------------------

export async function getGlobalOwnerRole() {
	return Db.collections.Role.findOneByOrFail({
		name: 'owner',
		scope: 'global',
	});
}

export async function getGlobalMemberRole() {
	return Db.collections.Role.findOneByOrFail({
		name: 'member',
		scope: 'global',
	});
}

export async function getWorkflowOwnerRole() {
	return Db.collections.Role.findOneByOrFail({
		name: 'owner',
		scope: 'workflow',
	});
}

export async function getWorkflowEditorRole() {
	return Db.collections.Role.findOneByOrFail({
		name: 'editor',
		scope: 'workflow',
	});
}

export async function getCredentialOwnerRole() {
	return Db.collections.Role.findOneByOrFail({
		name: 'owner',
		scope: 'credential',
	});
}

export async function getAllRoles() {
	return Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
		getWorkflowOwnerRole(),
		getCredentialOwnerRole(),
	]);
}

export const getAllUsers = async () =>
	Db.collections.User.find({
		relations: ['globalRole', 'authIdentities'],
	});

export const getLdapIdentities = async () =>
	Db.collections.AuthIdentity.find({
		where: { providerType: 'ldap' },
		relations: ['user'],
	});

// ----------------------------------
//          Execution helpers
// ----------------------------------

export async function createManyExecutions(
	amount: number,
	workflow: WorkflowEntity,
	callback: (workflow: WorkflowEntity) => Promise<ExecutionEntity>,
) {
	const executionsRequests = [...Array(amount)].map(async (_) => callback(workflow));
	return Promise.all(executionsRequests);
}

/**
 * Store a execution in the DB and assign it to a workflow.
 */
async function createExecution(attributes: Partial<ExecutionEntity>, workflow: WorkflowEntity) {
	const { data, finished, mode, startedAt, stoppedAt, waitTill } = attributes;

	const execution = await Db.collections.Execution.save({
		data: data ?? '[]',
		finished: finished ?? true,
		mode: mode ?? 'manual',
		startedAt: startedAt ?? new Date(),
		...(workflow !== undefined && { workflowData: workflow, workflowId: workflow.id }),
		stoppedAt: stoppedAt ?? new Date(),
		waitTill: waitTill ?? null,
	});

	return execution;
}

/**
 * Store a successful execution in the DB and assign it to a workflow.
 */
export async function createSuccessfulExecution(workflow: WorkflowEntity) {
	return createExecution({ finished: true }, workflow);
}

/**
 * Store an error execution in the DB and assign it to a workflow.
 */
export async function createErrorExecution(workflow: WorkflowEntity) {
	return createExecution({ finished: false, stoppedAt: new Date() }, workflow);
}

/**
 * Store a waiting execution in the DB and assign it to a workflow.
 */
export async function createWaitingExecution(workflow: WorkflowEntity) {
	return createExecution({ finished: false, waitTill: new Date() }, workflow);
}

// ----------------------------------
//          Tags
// ----------------------------------

export async function createTag(attributes: Partial<TagEntity> = {}) {
	const { name } = attributes;

	return Db.collections.Tag.save({
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
	const workflowRequests = [...Array(amount)].map(async (_) => createWorkflow(attributes, user));
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
	return Db.collections.SharedWorkflow.findBy({
		workflowId: workflow.id,
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
	schema: type === 'postgres' ? config.getEnv('database.postgresdb.schema') : undefined,
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
	migrationsRun: false,
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
