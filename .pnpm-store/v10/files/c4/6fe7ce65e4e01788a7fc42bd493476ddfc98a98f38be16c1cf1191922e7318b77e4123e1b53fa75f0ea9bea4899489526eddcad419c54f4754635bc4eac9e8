import { Readable } from "stream";
import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { CommitOptions, ContentToCopy, DirectoryToCopy, ExecOptions, ExecResult, FileToCopy, Labels } from "../types";
export declare class AbstractStartedContainer implements StartedTestContainer {
    protected readonly startedTestContainer: StartedTestContainer;
    constructor(startedTestContainer: StartedTestContainer);
    protected containerStopping?(): Promise<void>;
    stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
    protected containerStopped?(): Promise<void>;
    restart(options?: Partial<RestartOptions>): Promise<void>;
    commit(options: CommitOptions): Promise<string>;
    getHost(): string;
    getHostname(): string;
    getFirstMappedPort(): number;
    getMappedPort(port: number, protocol?: string): number;
    getMappedPort(portWithProtocol: `${number}/${"tcp" | "udp"}`): number;
    getName(): string;
    getLabels(): Labels;
    getId(): string;
    getNetworkNames(): string[];
    getNetworkId(networkName: string): string;
    getIpAddress(networkName: string): string;
    copyFilesToContainer(filesToCopy: FileToCopy[]): Promise<void>;
    copyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): Promise<void>;
    copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void>;
    copyArchiveToContainer(tar: Readable, target?: string): Promise<void>;
    copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
    exec(command: string | string[], opts?: Partial<ExecOptions>): Promise<ExecResult>;
    logs(opts?: {
        since?: number;
        tail?: number;
    }): Promise<Readable>;
    [Symbol.asyncDispose](): Promise<void>;
}
