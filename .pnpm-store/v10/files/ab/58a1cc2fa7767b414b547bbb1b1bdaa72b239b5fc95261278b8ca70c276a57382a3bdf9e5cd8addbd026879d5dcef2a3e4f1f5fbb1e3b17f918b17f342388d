import { Readable } from "stream";
import { StartedNetwork } from "./network/network";
import { ArchiveToCopy, BindMount, CommitOptions, ContentToCopy, DirectoryToCopy, Environment, ExecOptions, ExecResult, ExtraHost, FileToCopy, Labels, ResourcesQuota, TmpFs, Ulimits } from "./types";
import { PortWithOptionalBinding } from "./utils/port";
import { ImagePullPolicy } from "./utils/pull-policy";
import { WaitStrategy } from "./wait-strategies/wait-strategy";
export interface TestContainer {
    start(): Promise<StartedTestContainer>;
    withEnvironment(environment: Environment): this;
    withCommand(command: string[]): this;
    withEntrypoint(entrypoint: string[]): this;
    withTmpFs(tmpFs: TmpFs): this;
    withUlimits(ulimits: Ulimits): this;
    withAddedCapabilities(...capabilities: string[]): this;
    withDroppedCapabilities(...capabilities: string[]): this;
    withExposedPorts(...ports: PortWithOptionalBinding[]): this;
    withBindMounts(bindMounts: BindMount[]): this;
    withWaitStrategy(waitStrategy: WaitStrategy): this;
    withStartupTimeout(startupTimeoutMs: number): this;
    withNetwork(network: StartedNetwork): this;
    withNetworkMode(networkMode: string): this;
    withExtraHosts(extraHosts: ExtraHost[]): this;
    withDefaultLogDriver(): this;
    withPrivilegedMode(): this;
    withPlatform(platform: string): this;
    withUser(user: string): this;
    withPullPolicy(pullPolicy: ImagePullPolicy): this;
    withReuse(): this;
    withAutoRemove(autoRemove: boolean): this;
    withCopyFilesToContainer(filesToCopy: FileToCopy[]): this;
    withCopyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): this;
    withCopyContentToContainer(contentsToCopy: ContentToCopy[]): this;
    withCopyArchivesToContainer(archivesToCopy: ArchiveToCopy[]): this;
    withWorkingDir(workingDir: string): this;
    withResourcesQuota(resourcesQuota: ResourcesQuota): this;
    withSharedMemorySize(bytes: number): this;
    withLogConsumer(logConsumer: (stream: Readable) => unknown): this;
    withHostname(hostname: string): this;
}
export interface RestartOptions {
    timeout: number;
}
export interface StopOptions {
    timeout: number;
    remove: boolean;
    removeVolumes: boolean;
}
export interface StartedTestContainer extends AsyncDisposable {
    stop(options?: Partial<StopOptions>): Promise<StoppedTestContainer>;
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
    copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
    copyArchiveToContainer(tar: Readable, target?: string): Promise<void>;
    copyDirectoriesToContainer(directoriesToCopy: DirectoryToCopy[]): Promise<void>;
    copyFilesToContainer(filesToCopy: FileToCopy[]): Promise<void>;
    copyContentToContainer(contentsToCopy: ContentToCopy[]): Promise<void>;
    exec(command: string | string[], opts?: Partial<ExecOptions>): Promise<ExecResult>;
    logs(opts?: {
        since?: number;
        tail?: number;
    }): Promise<Readable>;
}
export interface StoppedTestContainer {
    getId(): string;
    copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
}
