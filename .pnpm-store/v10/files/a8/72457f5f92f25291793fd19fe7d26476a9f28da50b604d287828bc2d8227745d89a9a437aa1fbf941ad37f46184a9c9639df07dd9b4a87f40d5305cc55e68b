/// <reference types="node" />
import { Agent } from 'http';
import { ApiKey, AuthAccessTokenCredentials, AuthClientCredentials, AuthUserPasswordCredentials, OidcAuthenticator } from './auth.js';
/**
 * You can only specify the gRPC proxy URL at this point in time. This is because ProxiesParams should be used to define tunnelling proxies
 * and Weaviate does not support tunnelling proxies over HTTP/1.1 at this time.
 *
 * To use a forwarding proxy you should instead specify its URL as if it were the Weaviate instance itself.
 */
export type ProxiesParams = {
    grpc?: string;
};
export type TimeoutParams = {
    /** Define the configured timeout when querying data from Weaviate */
    query?: number;
    /** Define the configured timeout when mutating data to Weaviate */
    insert?: number;
    /** Define the configured timeout when initially connecting to Weaviate */
    init?: number;
};
export type InternalConnectionParams = {
    authClientSecret?: AuthClientCredentials | AuthAccessTokenCredentials | AuthUserPasswordCredentials;
    apiKey?: ApiKey;
    host: string;
    scheme?: string;
    headers?: HeadersInit;
    grpcProxyUrl?: string;
    agent?: Agent;
    timeout?: TimeoutParams;
    skipInitChecks?: boolean;
};
export interface ConnectionDetails {
    host: string;
    bearerToken?: string;
    headers?: HeadersInit;
}
export interface IConnection {
    postReturn: <B, T>(path: string, payload: B) => Promise<T>;
    postEmpty: <B>(path: string, payload: B) => Promise<void>;
    put: (path: string, payload: any, expectReturnContent?: boolean) => Promise<any>;
    patch: (path: string, payload: any) => Promise<any>;
    delete: (path: string, payload: any, expectReturnContent?: boolean) => Promise<any>;
    head: (path: string, payload: any) => Promise<boolean>;
    get: <T>(path: string, expectReturnContent?: boolean) => Promise<T>;
    login(): Promise<string>;
    getDetails(): Promise<ConnectionDetails>;
}
export default class ConnectionREST implements IConnection {
    private apiKey?;
    private headers?;
    protected authEnabled: boolean;
    readonly host: string;
    readonly http: HttpClient;
    oidcAuth?: OidcAuthenticator;
    constructor(params: InternalConnectionParams);
    private parseAuthParams;
    private sanitizeParams;
    postReturn: <B, T>(path: string, payload: B) => Promise<T>;
    postEmpty: <B>(path: string, payload: B) => Promise<void>;
    put: (path: string, payload: any, expectReturnContent?: boolean) => any;
    patch: (path: string, payload: any) => any;
    delete: (path: string, payload: any, expectReturnContent?: boolean) => any;
    head: (path: string, payload: any) => any;
    get: <T>(path: string, expectReturnContent?: boolean) => Promise<T>;
    login: () => Promise<string>;
    getDetails: () => Promise<ConnectionDetails>;
}
export * from './auth.js';
export interface HttpClient {
    close: () => void;
    patch: (path: string, payload: any, bearerToken?: string) => any;
    head: (path: string, payload: any, bearerToken?: string) => any;
    post: <B, T>(path: string, payload: B, expectReturnContent: boolean, bearerToken: string) => Promise<T | undefined>;
    get: <T>(path: string, expectReturnContent?: boolean, bearerToken?: string) => Promise<T>;
    externalPost: (externalUrl: string, body: any, contentType: any) => any;
    getRaw: (path: string, bearerToken?: string) => any;
    delete: (path: string, payload: any, expectReturnContent?: boolean, bearerToken?: string) => any;
    put: (path: string, payload: any, expectReturnContent?: boolean, bearerToken?: string) => any;
    externalGet: (externalUrl: string) => Promise<any>;
}
export declare const httpClient: (config: InternalConnectionParams) => HttpClient;
