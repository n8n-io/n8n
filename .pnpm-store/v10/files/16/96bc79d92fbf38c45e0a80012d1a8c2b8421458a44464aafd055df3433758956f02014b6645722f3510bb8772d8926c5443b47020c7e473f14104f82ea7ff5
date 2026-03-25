import Dockerode from "dockerode";
import { Uuid } from "../common";
import { ContainerRuntimeClient } from "../container-runtime";
export declare class Network {
    private readonly uuid;
    constructor(uuid?: Uuid);
    start(): Promise<StartedNetwork>;
}
export declare class StartedNetwork implements AsyncDisposable {
    private readonly client;
    private readonly name;
    private readonly network;
    constructor(client: ContainerRuntimeClient, name: string, network: Dockerode.Network);
    getId(): string;
    getName(): string;
    stop(): Promise<StoppedNetwork>;
    [Symbol.asyncDispose](): Promise<void>;
}
export declare class StoppedNetwork {
}
