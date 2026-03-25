import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy, WaitStrategy } from "./wait-strategy";
export declare class CompositeWaitStrategy extends AbstractWaitStrategy {
    private readonly waitStrategies;
    private deadline?;
    constructor(waitStrategies: WaitStrategy[]);
    waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;
    withStartupTimeout(startupTimeoutMs: number): this;
    withDeadline(deadline: number): this;
}
