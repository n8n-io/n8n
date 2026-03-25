import { Readable } from "stream";
import { AuthConfig } from "./container-runtime/auth/types";
import { ContainerCommitOptions } from "./container-runtime/clients/container/types";
export type InspectResult = {
    name: string;
    hostname: string;
    ports: Ports;
    healthCheckStatus: HealthCheckStatus;
    networkSettings: {
        [networkName: string]: NetworkSettings;
    };
    state: {
        status: string;
        running: boolean;
        startedAt: Date;
        finishedAt: Date | undefined;
    };
    labels: Labels;
};
export type ContainerRuntime = "docker" | "podman";
export type Environment = {
    [key in string]: string;
};
export type BindMode = "rw" | "ro" | "z" | "Z";
export type BindMount = {
    source: string;
    target: string;
    mode?: BindMode;
};
export type FileToCopy = {
    source: string;
    target: string;
    mode?: number;
};
export type DirectoryToCopy = FileToCopy;
export type Content = string | Buffer | Readable;
export type ContentToCopy = {
    content: Content;
    target: string;
    mode?: number;
};
export type ArchiveToCopy = {
    tar: Readable;
    target: string;
};
export type TmpFs = {
    [dir in string]: string;
};
export type Ulimits = {
    [name: string]: {
        hard: number | undefined;
        soft: number | undefined;
    };
};
export type ResourcesQuota = {
    memory?: number;
    cpu?: number;
};
export type HealthCheck = {
    test: ["CMD-SHELL", string] | ["CMD", ...string[]];
    interval?: number;
    timeout?: number;
    retries?: number;
    startPeriod?: number;
};
export type ExtraHost = {
    host: string;
    ipAddress: string;
};
export type Labels = {
    [key: string]: string;
};
export type HostPortBindings = Array<{
    hostIp: string;
    hostPort: number;
}>;
export type Ports = {
    [containerPortWithProtocol: string]: HostPortBindings;
};
export type RegistryConfig = {
    [registryAddress: string]: AuthConfig;
};
export type BuildArgs = {
    [key in string]: string;
};
export type ExecOptions = {
    workingDir: string;
    user: string;
    env: Environment;
};
export type ExecResult = {
    output: string;
    stdout: string;
    stderr: string;
    exitCode: number;
};
/**
 * Options for committing a container to an image; see https://docs.docker.com/engine/reference/commandline/commit/
 * @param deleteOnExit If true, the image will be cleaned up by reaper on exit
 * @param changes Additional changes to apply to the container before committing it to an image (e.g. ["ENV TEST=true"])
 */
export type CommitOptions = Omit<ContainerCommitOptions, "changes"> & {
    deleteOnExit?: boolean;
    changes?: string[];
};
export type HealthCheckStatus = "none" | "starting" | "unhealthy" | "healthy";
export type NetworkSettings = {
    networkId: string;
    ipAddress: string;
};
