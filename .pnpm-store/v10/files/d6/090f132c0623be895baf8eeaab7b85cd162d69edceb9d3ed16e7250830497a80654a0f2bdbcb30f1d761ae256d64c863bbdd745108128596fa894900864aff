import Dockerode from "dockerode";
import { StoppedTestContainer } from "../test-container";
export declare class StoppedGenericContainer implements StoppedTestContainer {
    private readonly container;
    constructor(container: Dockerode.Container);
    getId(): string;
    copyArchiveFromContainer(path: string): Promise<NodeJS.ReadableStream>;
}
