import { Network, NetworkCreateOptions } from "dockerode";
export interface NetworkClient {
    getById(id: string): Network;
    create(opts: NetworkCreateOptions): Promise<Network>;
    remove(network: Network): Promise<void>;
}
