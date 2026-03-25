import { ComposeClient } from "./compose/compose-client";
import { ContainerClient } from "./container/container-client";
import { ImageClient } from "./image/image-client";
import { NetworkClient } from "./network/network-client";
import { Info } from "./types";
export declare class ContainerRuntimeClient {
    readonly info: Info;
    readonly compose: ComposeClient;
    readonly container: ContainerClient;
    readonly image: ImageClient;
    readonly network: NetworkClient;
    constructor(info: Info, compose: ComposeClient, container: ContainerClient, image: ImageClient, network: NetworkClient);
}
export declare function getContainerRuntimeClient(): Promise<ContainerRuntimeClient>;
