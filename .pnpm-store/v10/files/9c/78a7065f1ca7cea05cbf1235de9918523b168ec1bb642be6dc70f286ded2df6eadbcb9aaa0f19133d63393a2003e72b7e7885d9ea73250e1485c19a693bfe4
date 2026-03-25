import Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";
export type StartupStatus = "PENDING" | "SUCCESS" | "FAIL";
export declare abstract class StartupCheckStrategy extends AbstractWaitStrategy {
    constructor();
    abstract checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus>;
    waitUntilReady(container: Dockerode.Container): Promise<void>;
}
