import Dockerode from "dockerode";
import { StartupCheckStrategy, StartupStatus } from "./startup-check-strategy";
export declare class OneShotStartupCheckStrategy extends StartupCheckStrategy {
    DOCKER_TIMESTAMP_ZERO: string;
    private isDockerTimestampNonEmpty;
    private isContainerStopped;
    checkStartupState(dockerClient: Dockerode, containerId: string): Promise<StartupStatus>;
}
