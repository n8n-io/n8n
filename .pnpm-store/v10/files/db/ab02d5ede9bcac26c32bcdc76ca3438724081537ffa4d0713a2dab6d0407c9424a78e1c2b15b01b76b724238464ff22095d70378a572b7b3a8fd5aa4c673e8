import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";
export type Log = string;
export declare class LogWaitStrategy extends AbstractWaitStrategy {
    private readonly message;
    private readonly times;
    constructor(message: Log | RegExp, times: number);
    waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;
}
