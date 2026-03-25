import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";
export interface WaitStrategy {
    waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;
    withStartupTimeout(startupTimeoutMs: number): WaitStrategy;
    isStartupTimeoutSet(): boolean;
    getStartupTimeout(): number;
}
export declare abstract class AbstractWaitStrategy implements WaitStrategy {
    protected startupTimeoutMs: number;
    private startupTimeoutSet;
    abstract waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts, startTime?: Date): Promise<void>;
    withStartupTimeout(startupTimeoutMs: number): this;
    isStartupTimeoutSet(): boolean;
    getStartupTimeout(): number;
}
