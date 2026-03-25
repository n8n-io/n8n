import { ClientParams, WeaviateClient } from '../index.js';
import { AuthCredentials } from './auth.js';
import { ProxiesParams, TimeoutParams } from './http.js';
/** The options available to the `weaviate.connectToWeaviateCloud` method. */
export type ConnectToWeaviateCloudOptions = {
    /** The authentication credentials to use when connecting to Weaviate, e.g. API key */
    authCredentials?: AuthCredentials;
    /** Additional headers to include in the request */
    headers?: Record<string, string>;
    /** The timeouts to use when making requests to Weaviate */
    timeout?: TimeoutParams;
    /** Whether to skip the initialization checks */
    skipInitChecks?: boolean;
};
/** @deprecated Use `ConnectToWeaviateCloudOptions` instead. */
export type ConnectToWCDOptions = ConnectToWeaviateCloudOptions;
/** @deprecated Use `ConnectToWeaviateCloudOptions` instead. */
export type ConnectToWCSOptions = ConnectToWeaviateCloudOptions;
export type ConnectToLocalOptions = {
    /** The host where Weaviate is served. Assumes that the HTTP/1.1 and HTTP/2 servers are served on the same host */
    host?: string;
    /** The port of the HTTP/1.1 server */
    port?: number;
    /** The port of the HTTP/2 server */
    grpcPort?: number;
    /** The authentication credentials to use when connecting to Weaviate, e.g. API key */
    authCredentials?: AuthCredentials;
    /** Additional headers to include in the request */
    headers?: Record<string, string>;
    /** The timeouts to use when making requests to Weaviate */
    timeout?: TimeoutParams;
    /** Whether to skip the initialization checks */
    skipInitChecks?: boolean;
};
export type ConnectToCustomOptions = {
    /** The hostname of the HTTP/1.1 server */
    httpHost?: string;
    /** An additional path of the HTTP/1.1 server, e.g. `http://proxy.net/weaviate` */
    httpPath?: string;
    /** The port of the HTTP/1.1 server */
    httpPort?: number;
    /** Whether to use a secure connection to the HTTP/1.1 server */
    httpSecure?: boolean;
    /** The hostname of the HTTP/2 server */
    grpcHost?: string;
    /** The port of the HTTP/2 server */
    grpcPort?: number;
    /** Whether to use a secure connection to the HTTP/2 server */
    grpcSecure?: boolean;
    /** The authentication credentials to use when connecting to Weaviate, e.g. API key */
    authCredentials?: AuthCredentials;
    /** Additional headers to include in the request */
    headers?: Record<string, string>;
    /** The proxy configuration to use */
    proxies?: ProxiesParams;
    /** The timeouts to use when making requests to Weaviate */
    timeout?: TimeoutParams;
    /** Whether to skip the initialization checks */
    skipInitChecks?: boolean;
};
export declare function connectToWeaviateCloud(clusterURL: string, clientMaker: (params: ClientParams) => Promise<WeaviateClient>, options?: ConnectToWeaviateCloudOptions): Promise<WeaviateClient>;
export declare function connectToLocal(clientMaker: (params: ClientParams) => Promise<WeaviateClient>, options?: ConnectToLocalOptions): Promise<WeaviateClient>;
export declare function connectToCustom(clientMaker: (params: ClientParams) => Promise<WeaviateClient>, options?: ConnectToCustomOptions): Promise<WeaviateClient>;
