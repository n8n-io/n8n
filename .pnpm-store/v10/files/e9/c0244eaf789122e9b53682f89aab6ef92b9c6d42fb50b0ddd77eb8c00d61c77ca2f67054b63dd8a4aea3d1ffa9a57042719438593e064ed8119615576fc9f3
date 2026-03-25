import Dockerode from "dockerode";
import { ContainerRuntimeClient } from "../../container-runtime";
export interface PortCheck {
    isBound(port: number | string): Promise<boolean>;
}
export declare class HostPortCheck implements PortCheck {
    private readonly client;
    constructor(client: ContainerRuntimeClient);
    isBound(port: number | string): Promise<boolean>;
}
export declare class InternalPortCheck implements PortCheck {
    private readonly client;
    private readonly container;
    private isDistroless;
    private readonly commandOutputs;
    constructor(client: ContainerRuntimeClient, container: Dockerode.Container);
    isBound(port: number | string): Promise<boolean>;
    private commandOutputsKey;
}
