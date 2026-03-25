import { AbstractStartedContainer } from "../generic-container/abstract-started-container";
import { GenericContainer } from "../generic-container/generic-container";
import { StartedTestContainer } from "../test-container";
export declare class SocatContainer extends GenericContainer {
    private targets;
    constructor(image?: string);
    withTarget(exposePort: number, host: string, internalPort?: number): this;
    start(): Promise<StartedSocatContainer>;
}
export declare class StartedSocatContainer extends AbstractStartedContainer {
    constructor(startedTestcontainers: StartedTestContainer);
}
