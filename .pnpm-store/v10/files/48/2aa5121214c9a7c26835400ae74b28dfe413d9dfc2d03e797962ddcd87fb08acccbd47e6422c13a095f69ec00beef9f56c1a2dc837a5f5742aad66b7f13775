import Dockerode, { ContainerInspectInfo } from "dockerode";
import { Readable } from "stream";
import { RestartOptions, StartedTestContainer, StopOptions, StoppedTestContainer } from "../test-container";
import { CommitOptions, ContentToCopy, DirectoryToCopy, ExecOptions, ExecResult, FileToCopy, Labels } from "../types";
import { BoundPorts } from "../utils/bound-ports";
import { WaitStrategy } from "../wait-strategies/wait-strategy";
export declare class StartedGenericContainer implements StartedTestContainer {
    private readonly container;
    private readonly host;
    private inspectResult;
    private boundPorts;
    private readonly name;
    private readonly waitStrategy;
    private readonly autoRemove;
    private stoppedContainer?;
    private readonly stopContainerLock;
    constructor(container: Dockerode.Container, host: string, inspectResult: ContainerInspectInfo, boundPorts: BoundPorts, name: string, waitStrategy: WaitStrategy, autoRemove: boolean);
    protected containerIsStopping?(): Promise<void>;
    stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
    /**
     * Construct the command(s) to apply changes to the container before committing it to an image.
     */
    private getContainerCommitChangeCommands;
    commit(options: CommitOptions): Promise<string>;
    protected containerIsStopped?(): Promise<void>;
    restart(options?: Partial<RestartOptions>): Promise<void>;
    private stopContainer;
    getHost(): string;
    getHostname(): string;
    getFirstMappedPort(): number;
    getMappedPort(port: string | number, protocol?: string): number;
    getId(): string;
    getName(): string;
    getLabels(): Labels;
    getNetworkNames(): string[];
    getNetworkId(networkName: string): string;
    getIpAddress(networkName: string): string;
    private getNetworkSettings;
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
