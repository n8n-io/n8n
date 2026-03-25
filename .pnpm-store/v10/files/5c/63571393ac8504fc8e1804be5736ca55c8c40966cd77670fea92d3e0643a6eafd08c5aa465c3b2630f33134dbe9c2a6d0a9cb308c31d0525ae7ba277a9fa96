import { Root } from 'protobufjs';
import { Client, ChannelOptions, ChannelCredentials } from '@grpc/grpc-js';
import { Pool } from 'generic-pool';
import { ClientConfig, ServerInfo, CONNECT_STATUS, TLS_MODE } from '../';
/**
 * Base gRPC client, setup all configuration here
 */
export declare class BaseClient {
    channelPool: Pool<Client>;
    clientId: string;
    connectStatus: CONNECT_STATUS;
    connectPromise: Promise<void>;
    readonly tlsMode: TLS_MODE;
    readonly config: ClientConfig;
    readonly channelOptions: ChannelOptions;
    serverInfo: ServerInfo;
    timeout: number;
    protoFilePath: {
        milvus: string;
        schema: string;
    };
    protected creds: ChannelCredentials;
    protected metadata: Map<string, string>;
    protected schemaProto: Root;
    protected milvusProto: Root;
    protected readonly protoInternalPath: {
        serviceName: string;
        collectionSchema: string;
        fieldSchema: string;
        functionSchema: string;
    };
    /**
     * Sets up the configuration object for the gRPC client.
     *
     * @param configOrAddress The configuration object or the Milvus address as a string.
     * @param ssl Whether to use SSL or not. Default is false.
     * @param username The username for authentication. Required if password is provided.
     * @param password The password for authentication. Required if username is provided.
     */
    constructor(configOrAddress: ClientConfig | string, ssl?: boolean, username?: string, password?: string, channelOptions?: ChannelOptions);
    /**
     * Checks the compatibility of the SDK with the Milvus server.
     *
     * @param {Object} data - Optional data object.
     * @param {string} data.message - The error message to throw if the SDK is incompatible.
     * @param {Function} data.checker - A function to call if the SDK is compatible.
     * @throws {Error} If the SDK is incompatible with the server.
     */
    checkCompatibility(data?: {
        message?: string;
        checker?: Function;
    }): Promise<any>;
}
