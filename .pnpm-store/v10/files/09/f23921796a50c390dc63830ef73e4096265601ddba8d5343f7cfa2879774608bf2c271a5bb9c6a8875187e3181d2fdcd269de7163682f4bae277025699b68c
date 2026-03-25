import Dockerode, { Network, NetworkCreateOptions } from "dockerode";
import { NetworkClient } from "./network-client";
export declare class DockerNetworkClient implements NetworkClient {
    protected readonly dockerode: Dockerode;
    constructor(dockerode: Dockerode);
    getById(id: string): Network;
    create(opts: NetworkCreateOptions): Promise<Network>;
    remove(network: Dockerode.Network): Promise<void>;
}
