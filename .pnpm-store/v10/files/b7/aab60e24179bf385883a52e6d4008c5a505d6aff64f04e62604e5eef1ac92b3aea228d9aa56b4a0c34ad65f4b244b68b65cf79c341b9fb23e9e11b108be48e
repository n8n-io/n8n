/// <reference types="node" />
export type IDockerComposeExecutableOptions = {
    executablePath: string;
    options?: string[] | (string | string[])[];
    standalone?: never;
} | {
    executablePath?: string;
    options?: never;
    standalone: true;
};
export interface IDockerComposeOptions {
    cwd?: string;
    executable?: IDockerComposeExecutableOptions;
    config?: string | string[];
    configAsString?: string;
    log?: boolean;
    composeOptions?: string[] | (string | string[])[];
    commandOptions?: string[] | (string | string[])[];
    env?: NodeJS.ProcessEnv;
    callback?: (chunk: Buffer, streamSource?: 'stdout' | 'stderr') => void;
}
export type DockerComposePortResult = {
    address: string;
    port: number;
};
export type DockerComposeVersionResult = {
    version: string;
};
export type DockerComposeStatsResult = {
    BlockIO: string;
    CPUPerc: string;
    Container: string;
    ID: string;
    MemPerc: string;
    MemUsage: string;
    Name: string;
    NetIO: string;
    PIDs: string;
};
export type DockerComposeConfigResult = {
    config: {
        version: Record<string, string>;
        services: Record<string, string | Record<string, string>>;
        volumes: Record<string, string>;
    };
};
export type DockerComposeConfigServicesResult = {
    services: string[];
};
export type DockerComposeConfigVolumesResult = {
    volumes: string[];
};
export interface IDockerComposeLogOptions extends IDockerComposeOptions {
    follow?: boolean;
    timestamps?: boolean;
}
export interface IDockerComposeBuildOptions extends IDockerComposeOptions {
    parallel?: boolean;
}
export interface IDockerComposePushOptions extends IDockerComposeOptions {
    ignorePushFailures?: boolean;
}
export interface IDockerComposeResult {
    exitCode: number | null;
    out: string;
    err: string;
}
export type TypedDockerComposeResult<T> = {
    exitCode: number | null;
    out: string;
    err: string;
    data: T;
};
export type DockerComposePsResultService = {
    name: string;
    command: string;
    state: string;
    ports: Array<{
        mapped?: {
            address: string;
            port: number;
        };
        exposed: {
            port: number;
            protocol: string;
        };
    }>;
};
export type DockerComposeImListResultService = {
    container: string;
    repository: string;
    tag: string;
    id: string;
};
export type DockerComposePsResult = {
    services: Array<DockerComposePsResultService>;
};
export type DockerComposeImListResult = {
    services: Array<DockerComposeImListResultService>;
};
export declare const mapPsOutput: (output: string, options?: IDockerComposeOptions) => DockerComposePsResult;
export declare const mapImListOutput: (output: string, options?: IDockerComposeOptions) => DockerComposeImListResult;
/**
 * Executes docker compose command with common options
 */
export declare const execCompose: (command: any, args: any, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const upAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const upMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const upOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const downAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const down: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const downMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const downOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const stop: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const stopOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const stopMany: (options?: IDockerComposeOptions, ...services: string[]) => Promise<IDockerComposeResult>;
export declare const pauseOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const unpauseOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const kill: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const rm: (options?: IDockerComposeOptions, ...services: string[]) => Promise<IDockerComposeResult>;
export declare const exec: (container: string, command: string | string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const run: (container: string, command: string | string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const buildAll: (options?: IDockerComposeBuildOptions) => Promise<IDockerComposeResult>;
export declare const buildMany: (services: string[], options?: IDockerComposeBuildOptions) => Promise<IDockerComposeResult>;
export declare const buildOne: (service: string, options?: IDockerComposeBuildOptions) => Promise<IDockerComposeResult>;
export declare const createAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const createMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const createOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const pullAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const pullMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const pullOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const config: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposeConfigResult>>;
export declare const configServices: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposeConfigServicesResult>>;
export declare const configVolumes: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposeConfigVolumesResult>>;
export declare const ps: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposePsResult>>;
export declare const images: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposeImListResult>>;
export declare const push: (options?: IDockerComposePushOptions) => Promise<IDockerComposeResult>;
export declare const restartAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const restartMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const restartOne: (service: string, options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
export declare const logs: (services: string | string[], options?: IDockerComposeLogOptions) => Promise<IDockerComposeResult>;
export declare const port: (service: string, containerPort: string | number, options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposePortResult>>;
export declare const version: (options?: IDockerComposeOptions) => Promise<TypedDockerComposeResult<DockerComposeVersionResult>>;
export declare const stats: (service: string, options?: IDockerComposeOptions) => Promise<DockerComposeStatsResult>;
declare const _default: {
    upAll: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    upMany: (services: string[], options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    upOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    down: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    downAll: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    downOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    downMany: (services: string[], options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    stop: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    stopOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    stopMany: (options?: IDockerComposeOptions | undefined, ...services: string[]) => Promise<IDockerComposeResult>;
    pauseOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    unpauseOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    kill: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    rm: (options?: IDockerComposeOptions | undefined, ...services: string[]) => Promise<IDockerComposeResult>;
    exec: (container: string, command: string | string[], options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    run: (container: string, command: string | string[], options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    buildAll: (options?: IDockerComposeBuildOptions) => Promise<IDockerComposeResult>;
    buildMany: (services: string[], options?: IDockerComposeBuildOptions) => Promise<IDockerComposeResult>;
    buildOne: (service: string, options?: IDockerComposeBuildOptions | undefined) => Promise<IDockerComposeResult>;
    pullAll: (options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
    pullMany: (services: string[], options?: IDockerComposeOptions) => Promise<IDockerComposeResult>;
    pullOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    config: (options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposeConfigResult>>;
    configServices: (options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposeConfigServicesResult>>;
    configVolumes: (options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposeConfigVolumesResult>>;
    ps: (options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposePsResult>>;
    push: (options?: IDockerComposePushOptions) => Promise<IDockerComposeResult>;
    restartAll: (options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    restartMany: (services: string[], options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    restartOne: (service: string, options?: IDockerComposeOptions | undefined) => Promise<IDockerComposeResult>;
    logs: (services: string | string[], options?: IDockerComposeLogOptions) => Promise<IDockerComposeResult>;
    port: (service: string, containerPort: string | number, options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposePortResult>>;
    version: (options?: IDockerComposeOptions | undefined) => Promise<TypedDockerComposeResult<DockerComposeVersionResult>>;
    stats: (service: string, options?: IDockerComposeOptions | undefined) => Promise<DockerComposeStatsResult>;
};
export default _default;
