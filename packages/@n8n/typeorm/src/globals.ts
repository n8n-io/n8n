import { MetadataArgsStorage } from './metadata-args/MetadataArgsStorage';
import { DataSourceOptions } from './data-source/DataSourceOptions';
import { ConnectionOptionsReader } from './connection/ConnectionOptionsReader';
import { ConnectionManager } from './connection/ConnectionManager';
import { getFromContainer } from './container';
import { DataSource } from './data-source/DataSource';
import { EntityManager } from './entity-manager/EntityManager';
import { EntityTarget } from './common/EntityTarget';
import { Repository } from './repository/Repository';
import { TreeRepository } from './repository/TreeRepository';
import { ObjectType } from './common/ObjectType';
import { SelectQueryBuilder } from './query-builder/SelectQueryBuilder';
import { ObjectUtils } from './util/ObjectUtils';
import { ObjectLiteral } from './common/ObjectLiteral';

/**
 * Gets metadata args storage.
 */
export function getMetadataArgsStorage(): MetadataArgsStorage {
	// we should store metadata storage in a global variable otherwise it brings too much problems
	// one of the problem is that if any entity (or any other) will be imported before consumer will call
	// useContainer method with his own container implementation, that entity will be registered in the
	// old old container (default one post probably) and consumer will his entity.
	// calling useContainer before he imports any entity (or any other) is not always convenient.
	// another reason is that when we run migrations typeorm is being called from a global package
	// and it may load entities which register decorators in typeorm of local package
	// this leads to impossibility of usage of entities in migrations and cli related operations
	const globalScope = global as any;
	if (!globalScope.typeormMetadataArgsStorage)
		globalScope.typeormMetadataArgsStorage = new MetadataArgsStorage();

	return globalScope.typeormMetadataArgsStorage;
}

/**
 * Reads connection options stored in ormconfig configuration file.
 *
 * @deprecated
 */
export async function getConnectionOptions(
	connectionName: string = 'default',
): Promise<DataSourceOptions> {
	return new ConnectionOptionsReader().get(connectionName);
}

/**
 * Gets a ConnectionManager which creates connections.
 *
 * @deprecated
 */
export function getConnectionManager(): ConnectionManager {
	return getFromContainer(ConnectionManager);
}

/**
 * Creates a new connection and registers it in the manager.
 * Only one connection from ormconfig will be created (name "default" or connection without name).
 *
 * @deprecated
 */
export async function createConnection(): Promise<DataSource>;

/**
 * Creates a new connection from the ormconfig file with a given name.
 *
 * @deprecated
 */
export async function createConnection(name: string): Promise<DataSource>;

/**
 * Creates a new connection and registers it in the manager.
 *
 * @deprecated
 */
export async function createConnection(options: DataSourceOptions): Promise<DataSource>;

/**
 * Creates a new connection and registers it in the manager.
 *
 * If connection options were not specified, then it will try to create connection automatically,
 * based on content of ormconfig (json/js/env) file or environment variables.
 * Only one connection from ormconfig will be created (name "default" or connection without name).
 *
 * @deprecated
 */
export async function createConnection(optionsOrName?: any): Promise<DataSource> {
	const connectionName = typeof optionsOrName === 'string' ? optionsOrName : 'default';
	const options = ObjectUtils.isObject(optionsOrName)
		? (optionsOrName as DataSourceOptions)
		: await getConnectionOptions(connectionName);
	return getConnectionManager().create(options).connect();
}

/**
 * Creates new connections and registers them in the manager.
 *
 * If connection options were not specified, then it will try to create connection automatically,
 * based on content of ormconfig (json/js/env) file or environment variables.
 * All connections from the ormconfig will be created.
 *
 * @deprecated
 */
export async function createConnections(options?: DataSourceOptions[]): Promise<DataSource[]> {
	if (!options) options = await new ConnectionOptionsReader().all();
	const connections = options.map((options) => getConnectionManager().create(options));
	// Do not use Promise.all or test 8522 will produce a dangling sqlite connection
	for (const connection of connections) {
		await connection.connect();
	}
	return connections;
}

/**
 * Gets connection from the connection manager.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 *
 * @deprecated
 */
export function getConnection(connectionName: string = 'default'): DataSource {
	return getConnectionManager().get(connectionName);
}

/**
 * Gets entity manager from the connection.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 *
 * @deprecated
 */
export function getManager(connectionName: string = 'default'): EntityManager {
	return getConnectionManager().get(connectionName).manager;
}

/**
 * Gets repository for the given entity class.
 *
 * @deprecated
 */
export function getRepository<Entity extends ObjectLiteral>(
	entityClass: EntityTarget<Entity>,
	connectionName: string = 'default',
): Repository<Entity> {
	return getConnectionManager().get(connectionName).getRepository<Entity>(entityClass);
}

/**
 * Gets tree repository for the given entity class.
 *
 * @deprecated
 */
export function getTreeRepository<Entity extends ObjectLiteral>(
	entityClass: EntityTarget<Entity>,
	connectionName: string = 'default',
): TreeRepository<Entity> {
	return getConnectionManager().get(connectionName).getTreeRepository<Entity>(entityClass);
}

/**
 * Gets tree repository for the given entity class.
 *
 * @deprecated
 */
export function getCustomRepository<T>(
	customRepository: ObjectType<T>,
	connectionName: string = 'default',
): T {
	return getConnectionManager().get(connectionName).getCustomRepository(customRepository);
}

/**
 * Creates a new query builder.
 *
 * @deprecated
 */
export function createQueryBuilder<Entity extends ObjectLiteral>(
	entityClass?: EntityTarget<Entity>,
	alias?: string,
	connectionName: string = 'default',
): SelectQueryBuilder<Entity> {
	if (entityClass) {
		return getRepository(entityClass, connectionName).createQueryBuilder(alias);
	}

	return getConnection(connectionName).createQueryBuilder();
}
