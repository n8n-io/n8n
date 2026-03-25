import Dockerode from "dockerode";
import { BoundPorts } from "../utils/bound-ports";
import { AbstractWaitStrategy } from "./wait-strategy";
export declare class HostPortWaitStrategy extends AbstractWaitStrategy {
    waitUntilReady(container: Dockerode.Container, boundPorts: BoundPorts): Promise<void>;
    private waitForHostPorts;
    private waitForInternalPorts;
    private waitForPort;
}
