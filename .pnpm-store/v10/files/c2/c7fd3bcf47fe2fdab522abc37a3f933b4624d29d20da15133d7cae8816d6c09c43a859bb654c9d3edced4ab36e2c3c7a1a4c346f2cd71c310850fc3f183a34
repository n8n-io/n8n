import { ComposeDownOptions, ComposeOptions } from "../container-runtime";
import { StartedGenericContainer } from "../generic-container/started-generic-container";
import { DownedDockerComposeEnvironment } from "./downed-docker-compose-environment";
import { StoppedDockerComposeEnvironment } from "./stopped-docker-compose-environment";
export declare class StartedDockerComposeEnvironment implements AsyncDisposable {
    private readonly startedGenericContainers;
    private readonly options;
    constructor(startedGenericContainers: {
        [containerName: string]: StartedGenericContainer;
    }, options: ComposeOptions);
    stop(): Promise<StoppedDockerComposeEnvironment>;
    down(options?: Partial<ComposeDownOptions>): Promise<DownedDockerComposeEnvironment>;
    getContainer(containerName: string): StartedGenericContainer;
    [Symbol.asyncDispose](): Promise<void>;
}
