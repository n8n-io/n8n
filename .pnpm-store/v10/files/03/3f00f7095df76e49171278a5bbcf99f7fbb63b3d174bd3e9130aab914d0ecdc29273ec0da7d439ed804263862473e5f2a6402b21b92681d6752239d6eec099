import Dockerode from "dockerode";
import { AbstractWaitStrategy } from "./wait-strategy";
export declare class ShellWaitStrategy extends AbstractWaitStrategy {
    private readonly command;
    constructor(command: string);
    waitUntilReady(container: Dockerode.Container): Promise<void>;
}
