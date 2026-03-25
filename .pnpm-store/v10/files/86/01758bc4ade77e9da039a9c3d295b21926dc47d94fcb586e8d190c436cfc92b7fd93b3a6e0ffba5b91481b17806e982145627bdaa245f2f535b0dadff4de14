import Dockerode, { Container, ContainerCreateOptions, ContainerInfo, ContainerInspectInfo, ContainerLogsOptions, Network } from "dockerode";
import { Readable } from "stream";
import { ContainerClient } from "./container-client";
import { ContainerCommitOptions, ContainerStatus, ExecOptions, ExecResult } from "./types";
export declare class DockerContainerClient implements ContainerClient {
    readonly dockerode: Dockerode;
    constructor(dockerode: Dockerode);
    getById(id: string): Container;
    fetchByLabel(labelName: string, labelValue: string, opts?: {
        status?: ContainerStatus[];
    } | undefined): Promise<Container | undefined>;
    fetchArchive(container: Container, path: string): Promise<NodeJS.ReadableStream>;
    putArchive(container: Dockerode.Container, stream: Readable, path: string): Promise<void>;
    list(): Promise<ContainerInfo[]>;
    create(opts: ContainerCreateOptions): Promise<Container>;
    start(container: Container): Promise<void>;
    inspect(container: Dockerode.Container): Promise<ContainerInspectInfo>;
    stop(container: Container, opts?: {
        timeout: number;
    }): Promise<void>;
    attach(container: Container): Promise<Readable>;
    logs(container: Container, opts?: ContainerLogsOptions): Promise<Readable>;
    exec(container: Container, command: string[], opts?: Partial<ExecOptions>): Promise<ExecResult>;
    restart(container: Container, opts?: {
        timeout: number;
    }): Promise<void>;
    commit(container: Container, opts: ContainerCommitOptions): Promise<string>;
    remove(container: Container, opts?: {
        removeVolumes: boolean;
    }): Promise<void>;
    events(container: Container, eventNames: string[]): Promise<Readable>;
    protected demuxStream(containerId: string, stream: Readable): Promise<Readable>;
    connectToNetwork(container: Container, network: Network, networkAliases: string[]): Promise<void>;
}
