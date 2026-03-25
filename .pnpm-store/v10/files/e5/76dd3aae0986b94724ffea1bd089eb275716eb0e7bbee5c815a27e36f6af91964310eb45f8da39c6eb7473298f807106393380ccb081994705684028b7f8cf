import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";
export declare class PostgreSqlContainer extends GenericContainer {
    private database;
    private username;
    private password;
    constructor(image: string);
    withDatabase(database: string): this;
    withUsername(username: string): this;
    withPassword(password: string): this;
    start(): Promise<StartedPostgreSqlContainer>;
}
export declare class StartedPostgreSqlContainer extends AbstractStartedContainer {
    private readonly database;
    private readonly username;
    private readonly password;
    private snapshotName;
    constructor(startedTestContainer: StartedTestContainer, database: string, username: string, password: string);
    getPort(): number;
    getDatabase(): string;
    getUsername(): string;
    getPassword(): string;
    /**
     * @returns A connection URI in the form of `postgres[ql]://[username[:password]@][host[:port],]/database`
     */
    getConnectionUri(): string;
    /**
     * Sets the name to be used for database snapshots.
     * This name will be used as the default for snapshot() and restore() methods.
     *
     * @param snapshotName The name to use for snapshots (default is "migrated_template" if this method is not called)
     * @returns this (for method chaining)
     */
    withSnapshotName(snapshotName: string): this;
    /**
     * Takes a snapshot of the current state of the database as a template, which can then be restored using
     * the restore method.
     *
     * @param snapshotName Name for the snapshot, defaults to the value set by withSnapshotName() or "migrated_template" if not specified
     * @returns Promise resolving when snapshot is complete
     * @throws Error if attempting to snapshot the postgres system database or if using the same name as the database
     */
    snapshot(snapshotName?: string): Promise<void>;
    /**
     * Restores the database to a specific snapshot.
     *
     * @param snapshotName Name of the snapshot to restore from, defaults to the value set by withSnapshotName() or "migrated_template" if not specified
     * @returns Promise resolving when restore is complete
     * @throws Error if attempting to restore the postgres system database or if using the same name as the database
     */
    restoreSnapshot(snapshotName?: string): Promise<void>;
    /**
     * Executes a series of SQL commands against the Postgres database
     *
     * @param commands Array of SQL commands to execute in sequence
     * @throws Error if any command fails to execute with details of the failure
     */
    private execCommandsSQL;
    /**
     * Checks if the snapshot name is valid and if the database is not the postgres system database
     * @param snapshotName The name of the snapshot to check
     */
    private snapshotSanityCheck;
}
