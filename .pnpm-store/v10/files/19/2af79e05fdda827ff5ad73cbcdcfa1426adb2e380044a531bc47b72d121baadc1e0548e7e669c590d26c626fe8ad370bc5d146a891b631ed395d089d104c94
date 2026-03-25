import { Driver } from "../driver/Driver";
import { Repository } from "../repository/Repository";
import { EntitySubscriberInterface } from "../subscriber/EntitySubscriberInterface";
import { EntityTarget } from "../common/EntityTarget";
import { ObjectType } from "../common/ObjectType";
import { EntityManager } from "../entity-manager/EntityManager";
import { TreeRepository } from "../repository/TreeRepository";
import { NamingStrategyInterface } from "../naming-strategy/NamingStrategyInterface";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { Logger } from "../logger/Logger";
import { MigrationInterface } from "../migration/MigrationInterface";
import { Migration } from "../migration/Migration";
import { DataSourceOptions } from "./DataSourceOptions";
import { QueryRunner } from "../query-runner/QueryRunner";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { QueryResultCache } from "../cache/QueryResultCache";
import { RelationLoader } from "../query-builder/RelationLoader";
import { IsolationLevel } from "../driver/types/IsolationLevel";
import { ReplicationMode } from "../driver/types/ReplicationMode";
import { RelationIdLoader } from "../query-builder/RelationIdLoader";
import { ObjectLiteral } from "../common/ObjectLiteral";
/**
 * DataSource is a pre-defined connection configuration to a specific database.
 * You can have multiple data sources connected (with multiple connections in it),
 * connected to multiple databases in your application.
 *
 * Before, it was called `Connection`, but now `Connection` is deprecated
 * because `Connection` isn't the best name for what it's actually is.
 */
export declare class DataSource {
    readonly "@instanceof": symbol;
    /**
     * Connection name.
     *
     * @deprecated we don't need names anymore since we are going to drop all related methods relying on this property.
     */
    readonly name: string;
    /**
     * Connection options.
     */
    readonly options: DataSourceOptions;
    /**
     * Indicates if DataSource is initialized or not.
     */
    readonly isInitialized: boolean;
    /**
     * Database driver used by this connection.
     */
    driver: Driver;
    /**
     * EntityManager of this connection.
     */
    readonly manager: EntityManager;
    /**
     * Naming strategy used in the connection.
     */
    namingStrategy: NamingStrategyInterface;
    /**
     * Name for the metadata table
     */
    readonly metadataTableName: string;
    /**
     * Logger used to log orm events.
     */
    logger: Logger;
    /**
     * Migration instances that are registered for this connection.
     */
    readonly migrations: MigrationInterface[];
    /**
     * Entity subscriber instances that are registered for this connection.
     */
    readonly subscribers: EntitySubscriberInterface<any>[];
    /**
     * All entity metadatas that are registered for this connection.
     */
    readonly entityMetadatas: EntityMetadata[];
    /**
     * All entity metadatas that are registered for this connection.
     * This is a copy of #.entityMetadatas property -> used for more performant searches.
     */
    readonly entityMetadatasMap: Map<EntityTarget<any>, EntityMetadata>;
    /**
     * Used to work with query result cache.
     */
    queryResultCache?: QueryResultCache;
    /**
     * Used to load relations and work with lazy relations.
     */
    readonly relationLoader: RelationLoader;
    readonly relationIdLoader: RelationIdLoader;
    constructor(options: DataSourceOptions);
    /**
     Indicates if DataSource is initialized or not.
     *
     * @deprecated use .isInitialized instead
     */
    get isConnected(): boolean;
    /**
     * Updates current connection options with provided options.
     */
    setOptions(options: Partial<DataSourceOptions>): this;
    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     */
    initialize(): Promise<this>;
    /**
     * Performs connection to the database.
     * This method should be called once on application bootstrap.
     * This method not necessarily creates database connection (depend on database type),
     * but it also can setup a connection pool with database to use.
     *
     * @deprecated use .initialize method instead
     */
    connect(): Promise<this>;
    /**
     * Closes connection with the database.
     * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
     */
    destroy(): Promise<void>;
    /**
     * Closes connection with the database.
     * Once connection is closed, you cannot use repositories or perform any operations except opening connection again.
     *
     * @deprecated use .destroy method instead
     */
    close(): Promise<void>;
    /**
     * Creates database schema for all entities registered in this connection.
     * Can be used only after connection to the database is established.
     *
     * @param dropBeforeSync If set to true then it drops the database with all its tables and data
     */
    synchronize(dropBeforeSync?: boolean): Promise<void>;
    /**
     * Drops the database and all its data.
     * Be careful with this method on production since this method will erase all your database tables and their data.
     * Can be used only after connection to the database is established.
     */
    dropDatabase(): Promise<void>;
    /**
     * Runs all pending migrations.
     * Can be used only after connection to the database is established.
     */
    runMigrations(options?: {
        transaction?: "all" | "none" | "each";
        fake?: boolean;
    }): Promise<Migration[]>;
    /**
     * Reverts last executed migration.
     * Can be used only after connection to the database is established.
     */
    undoLastMigration(options?: {
        transaction?: "all" | "none" | "each";
        fake?: boolean;
    }): Promise<void>;
    /**
     * Lists all migrations and whether they have been run.
     * Returns true if there are pending migrations
     */
    showMigrations(): Promise<boolean>;
    /**
     * Checks if entity metadata exist for the given entity class, target name or table name.
     */
    hasMetadata(target: EntityTarget<any>): boolean;
    /**
     * Gets entity metadata for the given entity class or schema name.
     */
    getMetadata(target: EntityTarget<any>): EntityMetadata;
    /**
     * Gets repository for the given entity.
     */
    getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity>;
    /**
     * Gets tree repository for the given entity class or name.
     * Only tree-type entities can have a TreeRepository, like ones decorated with @Tree decorator.
     */
    getTreeRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): TreeRepository<Entity>;
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     *
     * @deprecated use Repository.extend function to create a custom repository
     */
    getCustomRepository<T>(customRepository: ObjectType<T>): T;
    /**
     * Wraps given function execution (and all operations made there) into a transaction.
     * All database operations must be executed using provided entity manager.
     */
    transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    transaction<T>(isolationLevel: IsolationLevel, runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    /**
     * Executes raw SQL query and returns raw database results.
     */
    query<T = any>(query: string, parameters?: any[], queryRunner?: QueryRunner): Promise<T>;
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;
    /**
     * Creates a query runner used for perform queries on a single database connection.
     * Using query runners you can control your queries to execute using single database connection and
     * manually control your database transaction.
     *
     * Mode is used in replication mode and indicates whatever you want to connect
     * to master database or any of slave databases.
     * If you perform writes you must use master database,
     * if you perform reads you can use slave databases.
     */
    createQueryRunner(mode?: ReplicationMode): QueryRunner;
    /**
     * Gets entity metadata of the junction table (many-to-many table).
     */
    getManyToManyMetadata(entityTarget: EntityTarget<any>, relationPropertyPath: string): EntityMetadata | undefined;
    /**
     * Creates an Entity Manager for the current connection with the help of the EntityManagerFactory.
     */
    createEntityManager(queryRunner?: QueryRunner): EntityManager;
    /**
     * Finds exist entity metadata by the given entity class, target name or table name.
     */
    protected findMetadata(target: EntityTarget<any>): EntityMetadata | undefined;
    /**
     * Builds metadatas for all registered classes inside this connection.
     */
    protected buildMetadatas(): Promise<void>;
    /**
     * Get the replication mode SELECT queries should use for this datasource by default
     */
    defaultReplicationModeForReads(): ReplicationMode;
}
