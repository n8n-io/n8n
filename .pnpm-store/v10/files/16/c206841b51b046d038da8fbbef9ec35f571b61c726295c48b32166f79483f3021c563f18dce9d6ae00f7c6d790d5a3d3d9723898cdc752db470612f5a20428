import { ChannelOptions } from '@grpc/grpc-js';
import { GRPCClient, ClientConfig, CreateColReq, ResStatus, CreateCollectionReq, CreateColWithSchemaAndIndexParamsReq } from '.';
/**
 * Milvus Client class that extends GRPCClient and handles communication with Milvus server.
 */
export declare class MilvusClient extends GRPCClient {
    /**
     * Returns the SDK information.
     * SDK information will be generated on the building phase
     * @returns Object containing SDK version and recommended Milvus version.
     */
    static get sdkInfo(): {
        version: string;
        recommendMilvus: string;
    };
    /**
     * Creates a new instance of MilvusClient.
     * @param configOrAddress The Milvus server's address or client configuration object.
     * @param ssl Whether to use SSL or not.
     * @param username The username for authentication.
     * @param password The password for authentication.
     * @param channelOptions Additional channel options for gRPC.
     */
    constructor(configOrAddress: ClientConfig | string, ssl?: boolean, username?: string, password?: string, channelOptions?: ChannelOptions);
    /**
     * Creates a new collection with the given parameters.
     * @function create_collection
     * @param {CreateColReq | CreateColWithSchemaAndIndexParamsReq | CreateCollectionReq} data - The data required to create the collection.
     * @returns {Promise<ResStatus>} - The result of the operation.
     */
    createCollection(data: CreateColReq | CreateColWithSchemaAndIndexParamsReq | CreateCollectionReq): Promise<ResStatus>;
}
