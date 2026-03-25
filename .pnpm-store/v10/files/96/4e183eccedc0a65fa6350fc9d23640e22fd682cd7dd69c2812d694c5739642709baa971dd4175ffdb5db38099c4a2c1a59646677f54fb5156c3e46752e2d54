import { Metadata, ChannelOptions } from '@grpc/grpc-js';
import { GetVersionResponse, CheckHealthResponse, CONNECT_STATUS, ClientConfig } from '../';
import { User } from './User';
export declare const LOADER_OPTIONS: {
    keepCase: boolean;
    longs: StringConstructor;
    enums: StringConstructor;
    defaults: boolean;
    oneofs: boolean;
};
/**
 * A client for interacting with the Milvus server via gRPC.
 */
export declare class GRPCClient extends User {
    /**
     * Creates a new instance of MilvusClient.
     * @param configOrAddress The Milvus server's address or client configuration object.
     * @param ssl Whether to use SSL or not.
     * @param username The username for authentication.
     * @param password The password for authentication.
     * @param channelOptions Additional channel options for gRPC.
     */
    constructor(configOrAddress: ClientConfig | string, ssl?: boolean, username?: string, password?: string, channelOptions?: ChannelOptions);
    connect(sdkVersion: string): void;
    /**
     * Creates a pool of gRPC service clients.
     *
     * @param {ServiceClientConstructor} ServiceClientConstructor - The constructor for the gRPC service client.
     *
     * @returns {Pool} - A pool of gRPC service clients.
     */
    private createChannelPool;
    /**
     * Injects client metadata into the metadata of the gRPC client.
     * @param metadata The metadata object of the gRPC client.
     * @returns The updated metadata object.
     */
    protected metadataListener(metadata: Metadata): Metadata;
    /**
     * Sets the active database for the gRPC client.
     * @param data An optional object containing the name of the database to use.
     * @returns A Promise that resolves with a `ResStatus` object.
     */
    use(data?: {
        db_name: string;
    }): Promise<any>;
    useDatabase: (data?: {
        db_name: string;
    }) => Promise<any>;
    /**
     * Retrieves server information from the Milvus server.
     * @param {string} sdkVersion - The version of the SDK being used.
     * @returns {Promise<void>} - A Promise that resolves when the server information has been retrieved.
     */
    private _getServerInfo;
    /**
     * Closes the connection to the Milvus server.
     * This method drains and clears the connection pool, and updates the connection status to SHUTDOWN.
     * @returns {Promise<CONNECT_STATUS>} The updated connection status.
     */
    closeConnection(): Promise<CONNECT_STATUS>;
    /**
     * Returns version information for the Milvus server.
     * This method returns a Promise that resolves with a `GetVersionResponse` object.
     */
    getVersion(): Promise<GetVersionResponse>;
    /**
     * Checks the health of the Milvus server.
     * This method returns a Promise that resolves with a `CheckHealthResponse` object.
     */
    checkHealth(): Promise<CheckHealthResponse>;
}
