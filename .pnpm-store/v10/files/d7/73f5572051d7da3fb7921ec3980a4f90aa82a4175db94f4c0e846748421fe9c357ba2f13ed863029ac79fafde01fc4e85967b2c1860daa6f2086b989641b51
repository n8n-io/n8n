import { ContainerRuntimeClient } from "../container-runtime";
export declare const REAPER_IMAGE: string;
export interface Reaper {
    sessionId: string;
    containerId: string;
    addSession(sessionId: string): void;
    addComposeProject(projectName: string): void;
}
export declare function getReaper(client: ContainerRuntimeClient): Promise<Reaper>;
