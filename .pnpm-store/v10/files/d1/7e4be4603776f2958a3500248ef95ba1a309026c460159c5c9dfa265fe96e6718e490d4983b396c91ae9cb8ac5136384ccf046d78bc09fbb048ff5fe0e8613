/// <reference types="node" />
import { ChannelOptions } from '@grpc/grpc-js';
import { Options as LoaderOption } from '@grpc/proto-loader';
import { Options } from 'generic-pool';
import { ResStatus } from './';
/**
 * Configuration options for the Milvus client.
 */
export interface ClientConfig {
    id?: string;
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
    isGlobal?: boolean;
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
export interface RunAnalyzerRequest {
    analyzer_params?: Record<string, any>;
    text: string | string[];
    with_detail?: boolean;
    with_hash?: boolean;
    db_name?: string;
    collection_name?: string;
    field_name?: string;
    analyzer_names?: string[];
}
type AnalyzerToken = {
    token: string;
    start_offset: number;
    end_offset: number;
    position: number;
    position_length: number;
    hash: number;
};
export type AnalyzerResult = {
    tokens: AnalyzerToken[];
};
export interface RunAnalyzerResponse {
    status: ResStatus;
    results: AnalyzerResult[];
}
export {};
