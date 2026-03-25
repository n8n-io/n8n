import { Uuid } from "../common";
import { BuildArgs } from "../types";
import { ImagePullPolicy } from "../utils/pull-policy";
import { GenericContainer } from "./generic-container";
export type BuildOptions = {
    deleteOnExit: boolean;
};
export declare class GenericContainerBuilder {
    private readonly context;
    private readonly dockerfileName;
    private readonly uuid;
    private buildArgs;
    private pullPolicy;
    private cache;
    private buildkit;
    private target?;
    private platform?;
    constructor(context: string, dockerfileName: string, uuid?: Uuid);
    withBuildArgs(buildArgs: BuildArgs): GenericContainerBuilder;
    withPullPolicy(pullPolicy: ImagePullPolicy): this;
    withCache(cache: boolean): this;
    withBuildkit(): this;
    withPlatform(platform: string): this;
    withTarget(target: string): this;
    build(image?: string, options?: BuildOptions): Promise<GenericContainer>;
    private getRegistryConfig;
}
