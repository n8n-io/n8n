import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";
export declare class UnixSocketStrategy implements ContainerRuntimeClientStrategy {
    private readonly platform;
    constructor(platform?: NodeJS.Platform);
    getName(): string;
    getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined>;
}
