import { ContainerRuntimeClientStrategy } from "./strategy";
import { ContainerRuntimeClientStrategyResult } from "./types";
export declare class RootlessUnixSocketStrategy implements ContainerRuntimeClientStrategy {
    private readonly platform;
    private readonly env;
    constructor(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv);
    getName(): string;
    getResult(): Promise<ContainerRuntimeClientStrategyResult | undefined>;
    private getSocketPathFromEnv;
    private getSocketPathFromHomeRunDir;
    private getSocketPathFromHomeDesktopDir;
    private getSocketPathFromRunDir;
}
