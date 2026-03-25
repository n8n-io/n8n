/// <reference types="node" />
import { ChannelOptions } from '@grpc/grpc-js';
import { Options as LoaderOption } from '@grpc/proto-loader';
import { Options } from 'generic-pool';
/**
 * Configuration options for the Milvus client.
 */
export interface ClientConfig {
    id?: string;
    protoFilePath?: {
        milvus?: string;
        schema?: string;
    };
    address: string;
    token?: string;
    ssl?: boolean;
    username?: string;
    password?: string;
    channelOptions?: ChannelOptions;
    timeout?: number | string;
    maxRetries?: number;
    retryDelay?: number;
    database?: string;
    logLevel?: string;
    logPrefix?: string;
    tls?: {
        rootCertPath?: string;
        rootCert?: Buffer;
        privateKeyPath?: string;
        privateKey?: Buffer;
        certChainPath?: string;
        certChain?: Buffer;
        verifyOptions?: Record<string, any>;
        serverName?: string;
        skipCertCheck?: boolean;
    };
    pool?: Options;
    __SKIP_CONNECT__?: boolean;
    loaderOptions?: LoaderOption;
    trace?: boolean;
}
export interface ServerInfo {
    build_tags?: string;
    build_time?: string;
    git_commit?: string;
    go_version?: string;
    deploy_mode?: string;
    reserved?: {
        [key: string]: any;
    };
}
