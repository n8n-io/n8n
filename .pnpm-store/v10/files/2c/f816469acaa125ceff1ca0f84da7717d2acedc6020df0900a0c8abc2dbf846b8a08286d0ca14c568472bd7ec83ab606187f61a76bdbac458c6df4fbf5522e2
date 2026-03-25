import type { PrepareFileuploadOKResponse, PrepareFileuploadParams, PushApiParams } from './registry-api-types';
import type { AccessTokens, Region } from '../config/types';
export declare class RegistryApi {
    private accessTokens;
    private region;
    constructor(accessTokens: AccessTokens, region: Region);
    get accessToken(): string | false | undefined;
    getBaseUrl(): string;
    setAccessTokens(accessTokens: AccessTokens): this;
    private request;
    authStatus(accessToken: string, verbose?: boolean): Promise<{
        viewerId: string;
        organizations: string[];
    }>;
    prepareFileUpload({ organizationId, name, version, filesHash, filename, isUpsert, }: PrepareFileuploadParams): Promise<PrepareFileuploadOKResponse>;
    pushApi({ organizationId, name, version, rootFilePath, filePaths, branch, isUpsert, isPublic, batchId, batchSize, }: PushApiParams): Promise<void>;
}
