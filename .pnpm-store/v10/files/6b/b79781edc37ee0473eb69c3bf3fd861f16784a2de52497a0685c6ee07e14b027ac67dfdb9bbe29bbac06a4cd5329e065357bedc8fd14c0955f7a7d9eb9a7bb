import { type FetchWithTimeoutOptions } from '../../utils/fetch-with-timeout';
import type { ReadStream } from 'fs';
import type { Readable } from 'node:stream';
import type { ListRemotesResponse, PushResponse, UpsertRemoteResponse } from './types';
interface BaseApiClient {
    request(url: string, options: FetchWithTimeoutOptions): Promise<Response>;
}
type CommandOption = 'push' | 'push-status';
export type SunsetWarning = {
    sunsetDate: Date;
    isSunsetExpired: boolean;
};
export type SunsetWarningsBuffer = SunsetWarning[];
export declare class ReuniteApiError extends Error {
    status: number;
    constructor(message: string, status: number);
}
declare class RemotesApi {
    private client;
    private readonly domain;
    private readonly apiKey;
    constructor(client: BaseApiClient, domain: string, apiKey: string);
    protected getParsedResponse<T>(response: Response): Promise<T>;
    getDefaultBranch(organizationId: string, projectId: string): Promise<string>;
    upsert(organizationId: string, projectId: string, remote: {
        mountPath: string;
        mountBranchName: string;
    }): Promise<UpsertRemoteResponse>;
    push(organizationId: string, projectId: string, payload: PushPayload, files: {
        path: string;
        stream: ReadStream | Buffer;
    }[]): Promise<PushResponse>;
    getRemotesList({ organizationId, projectId, mountPath, }: {
        organizationId: string;
        projectId: string;
        mountPath: string;
    }): Promise<ListRemotesResponse>;
    getPush({ organizationId, projectId, pushId, }: {
        organizationId: string;
        projectId: string;
        pushId: string;
    }): Promise<PushResponse>;
}
export declare class ReuniteApi {
    private apiClient;
    private version;
    private command;
    remotes: RemotesApi;
    constructor({ domain, apiKey, version, command, }: {
        domain: string;
        apiKey: string;
        version: string;
        command: CommandOption;
    });
    reportSunsetWarnings(): void;
}
export type PushPayload = {
    remoteId: string;
    commit: {
        message: string;
        branchName: string;
        sha?: string;
        url?: string;
        createdAt?: string;
        namespace?: string;
        repository?: string;
        author: {
            name: string;
            email: string;
            image?: string;
        };
    };
    isMainBranch?: boolean;
};
export declare function streamToBuffer(stream: ReadStream | Readable): Promise<Buffer>;
export {};
