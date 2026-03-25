import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";
export declare class MySqlContainer extends GenericContainer {
    private database;
    private username;
    private userPassword;
    private rootPassword;
    constructor(image: string);
    withDatabase(database: string): this;
    withUsername(username: string): this;
    withRootPassword(rootPassword: string): this;
    withUserPassword(userPassword: string): this;
    start(): Promise<StartedMySqlContainer>;
}
export declare class StartedMySqlContainer extends AbstractStartedContainer {
    private readonly database;
    private readonly username;
    private readonly userPassword;
    private readonly rootPassword;
    constructor(startedTestContainer: StartedTestContainer, database: string, username: string, userPassword: string, rootPassword: string);
    getPort(): number;
    getDatabase(): string;
    getUsername(): string;
    getUserPassword(): string;
    getRootPassword(): string;
    getConnectionUri(isRoot?: boolean): string;
    executeQuery(query: string, additionalFlags?: string[], isRoot?: boolean): Promise<string>;
}
