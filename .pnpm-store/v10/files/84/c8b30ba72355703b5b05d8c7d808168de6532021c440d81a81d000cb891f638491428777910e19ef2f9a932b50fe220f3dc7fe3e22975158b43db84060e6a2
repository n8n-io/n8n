import { MetadataArgsStorage } from "./metadata-args/MetadataArgsStorage";
import { DataSourceOptions } from "./data-source/DataSourceOptions";
import { ConnectionManager } from "./connection/ConnectionManager";
import { DataSource } from "./data-source/DataSource";
import { EntityManager } from "./entity-manager/EntityManager";
import { EntityTarget } from "./common/EntityTarget";
import { Repository } from "./repository/Repository";
import { TreeRepository } from "./repository/TreeRepository";
import { ObjectType } from "./common/ObjectType";
import { SelectQueryBuilder } from "./query-builder/SelectQueryBuilder";
import { ObjectLiteral } from "./common/ObjectLiteral";
/**
 * Gets metadata args storage.
 */
export declare function getMetadataArgsStorage(): MetadataArgsStorage;
/**
 * Reads connection options stored in ormconfig configuration file.
 *
 * @deprecated
 */
export declare function getConnectionOptions(connectionName?: string): Promise<DataSourceOptions>;
/**
 * Gets a ConnectionManager which creates connections.
 *
 * @deprecated
 */
export declare function getConnectionManager(): ConnectionManager;
/**
 * Creates a new connection and registers it in the manager.
 * Only one connection from ormconfig will be created (name "default" or connection without name).
 *
 * @deprecated
 */
export declare function createConnection(): Promise<DataSource>;
/**
 * Creates a new connection from the ormconfig file with a given name.
 *
 * @deprecated
 */
export declare function createConnection(name: string): Promise<DataSource>;
/**
 * Creates a new connection and registers it in the manager.
 *
 * @deprecated
 */
export declare function createConnection(options: DataSourceOptions): Promise<DataSource>;
/**
 * Creates new connections and registers them in the manager.
 *
 * If connection options were not specified, then it will try to create connection automatically,
 * based on content of ormconfig (json/js/env) file or environment variables.
 * All connections from the ormconfig will be created.
 *
 * @deprecated
 */
export declare function createConnections(options?: DataSourceOptions[]): Promise<DataSource[]>;
/**
 * Gets connection from the connection manager.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 *
 * @deprecated
 */
export declare function getConnection(connectionName?: string): DataSource;
/**
 * Gets entity manager from the connection.
 * If connection name wasn't specified, then "default" connection will be retrieved.
 *
 * @deprecated
 */
export declare function getManager(connectionName?: string): EntityManager;
/**
 * Gets repository for the given entity class.
 *
 * @deprecated
 */
export declare function getRepository<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, connectionName?: string): Repository<Entity>;
/**
 * Gets tree repository for the given entity class.
 *
 * @deprecated
 */
export declare function getTreeRepository<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, connectionName?: string): TreeRepository<Entity>;
/**
 * Gets tree repository for the given entity class.
 *
 * @deprecated
 */
export declare function getCustomRepository<T>(customRepository: ObjectType<T>, connectionName?: string): T;
/**
 * Creates a new query builder.
 *
 * @deprecated
 */
export declare function createQueryBuilder<Entity extends ObjectLiteral>(entityClass?: EntityTarget<Entity>, alias?: string, connectionName?: string): SelectQueryBuilder<Entity>;
