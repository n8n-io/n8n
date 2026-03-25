import { DataSource } from "../data-source/DataSource";
import { Migration } from "./Migration";
import { QueryRunner } from "../query-runner/QueryRunner";
/**
 * Executes migrations: runs pending and reverts previously executed migrations.
 */
export declare class MigrationExecutor {
    protected connection: DataSource;
    protected queryRunner?: QueryRunner | undefined;
    /**
     * Indicates how migrations should be run in transactions.
     *   all: all migrations are run in a single transaction
     *   none: all migrations are run without a transaction
     *   each: each migration is run in a separate transaction
     */
    transaction: "all" | "none" | "each";
    /**
     * Option to fake-run or fake-revert a migration, adding to the
     * executed migrations table, but not actually running it. This feature is
     * useful for when migrations are added after the fact or for
     * interoperability between applications which are desired to each keep
     * a consistent migration history.
     */
    fake: boolean;
    private readonly migrationsDatabase?;
    private readonly migrationsSchema?;
    private readonly migrationsTable;
    private readonly migrationsTableName;
    constructor(connection: DataSource, queryRunner?: QueryRunner | undefined);
    /**
     * Tries to execute a single migration given.
     */
    executeMigration(migration: Migration): Promise<Migration>;
    /**
     * Returns an array of all migrations.
     */
    getAllMigrations(): Promise<Migration[]>;
    /**
     * Returns an array of all executed migrations.
     */
    getExecutedMigrations(): Promise<Migration[]>;
    /**
     * Returns an array of all pending migrations.
     */
    getPendingMigrations(): Promise<Migration[]>;
    /**
     * Inserts an executed migration.
     */
    insertMigration(migration: Migration): Promise<void>;
    /**
     * Deletes an executed migration.
     */
    deleteMigration(migration: Migration): Promise<void>;
    /**
     * Lists all migrations and whether they have been executed or not
     * returns true if there are unapplied migrations
     */
    showMigrations(): Promise<boolean>;
    /**
     * Executes all pending migrations. Pending migrations are migrations that are not yet executed,
     * thus not saved in the database.
     */
    executePendingMigrations(): Promise<Migration[]>;
    /**
     * Reverts last migration that were run.
     */
    undoLastMigration(): Promise<void>;
    /**
     * Creates table "migrations" that will store information about executed migrations.
     */
    protected createMigrationsTableIfNotExist(queryRunner: QueryRunner): Promise<void>;
    /**
     * Loads all migrations that were executed and saved into the database (sorts by id).
     */
    protected loadExecutedMigrations(queryRunner: QueryRunner): Promise<Migration[]>;
    /**
     * Gets all migrations that setup for this connection.
     */
    protected getMigrations(): Migration[];
    protected checkForDuplicateMigrations(migrations: Migration[]): void;
    /**
     * Finds the latest migration (sorts by timestamp) in the given array of migrations.
     */
    protected getLatestTimestampMigration(migrations: Migration[]): Migration | undefined;
    /**
     * Finds the latest migration in the given array of migrations.
     * PRE: Migration array must be sorted by descending id.
     */
    protected getLatestExecutedMigration(sortedMigrations: Migration[]): Migration | undefined;
    /**
     * Inserts new executed migration's data into migrations table.
     */
    protected insertExecutedMigration(queryRunner: QueryRunner, migration: Migration): Promise<void>;
    /**
     * Delete previously executed migration's data from the migrations table.
     */
    protected deleteExecutedMigration(queryRunner: QueryRunner, migration: Migration): Promise<void>;
    protected withQueryRunner<T>(callback: (queryRunner: QueryRunner) => T | Promise<T>): Promise<T>;
}
