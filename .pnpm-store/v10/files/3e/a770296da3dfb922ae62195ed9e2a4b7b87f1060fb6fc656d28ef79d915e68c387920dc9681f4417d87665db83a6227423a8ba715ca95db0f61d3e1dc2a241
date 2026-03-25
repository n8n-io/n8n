import { AbstractStartedContainer, GenericContainer, StartedTestContainer } from "testcontainers";
export declare class RedisContainer extends GenericContainer {
    private readonly importFilePath;
    private password?;
    private persistenceVolume?;
    private initialImportScriptFile?;
    constructor(image: string);
    withPassword(password: string): this;
    withPersistence(sourcePath: string): this;
    withInitialData(importScriptFile: string): this;
    protected containerStarted(container: StartedTestContainer): Promise<void>;
    start(): Promise<StartedRedisContainer>;
    private importInitialData;
}
export declare class StartedRedisContainer extends AbstractStartedContainer {
    private readonly password?;
    constructor(startedTestContainer: StartedTestContainer, password?: string | undefined);
    getPort(): number;
    getPassword(): string;
    getConnectionUrl(): string;
    executeCliCmd(cmd: string, additionalFlags?: string[]): Promise<string>;
}
