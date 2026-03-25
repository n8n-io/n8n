import { BlobStore, BlobStoreOptions, MediaBlob } from "./utils/media_core.cjs";
import { GoogleConnectionParams, GoogleRawResponse, GoogleResponse } from "../types.cjs";
import { GoogleAbstractedClient, GoogleAbstractedClientOpsMethod } from "../auth.cjs";
import { GoogleHostConnection, GoogleRawConnection } from "../connection.cjs";
import { AsyncCaller, AsyncCallerCallOptions, AsyncCallerParams } from "@langchain/core/utils/async_caller";

//#region src/experimental/media.d.ts
interface GoogleUploadConnectionParams<AuthOptions> extends GoogleConnectionParams<AuthOptions> {}
declare abstract class GoogleMultipartUploadConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse, AuthOptions> extends GoogleHostConnection<CallOptions, ResponseType, AuthOptions> {
  constructor(fields: GoogleConnectionParams<AuthOptions> | undefined, caller: AsyncCaller, client: GoogleAbstractedClient);
  _body(separator: string, data: MediaBlob, metadata: Record<string, unknown>): Promise<string>;
  request(data: MediaBlob, metadata: Record<string, unknown>, options: CallOptions): Promise<ResponseType>;
}
declare abstract class GoogleDownloadConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse, AuthOptions> extends GoogleHostConnection<CallOptions, ResponseType, AuthOptions> {
  request(options: CallOptions): Promise<ResponseType>;
}
declare abstract class GoogleDownloadRawConnection<CallOptions extends AsyncCallerCallOptions, AuthOptions> extends GoogleRawConnection<CallOptions, AuthOptions> {
  buildMethod(): GoogleAbstractedClientOpsMethod;
  request(options: CallOptions): Promise<GoogleRawResponse>;
}
interface BlobStoreGoogleParams<AuthOptions> extends GoogleConnectionParams<AuthOptions>, AsyncCallerParams, BlobStoreOptions {}
declare abstract class BlobStoreGoogle<ResponseType extends GoogleResponse, AuthOptions> extends BlobStore {
  caller: AsyncCaller;
  client: GoogleAbstractedClient;
  constructor(fields?: BlobStoreGoogleParams<AuthOptions>);
  abstract buildClient(fields?: BlobStoreGoogleParams<AuthOptions>): GoogleAbstractedClient;
  abstract buildSetMetadata([key, blob]: [string, MediaBlob]): Record<string, unknown>;
  abstract buildSetConnection([key, blob]: [string, MediaBlob]): GoogleMultipartUploadConnection<AsyncCallerCallOptions, ResponseType, AuthOptions>;
  _set(keyValuePair: [string, MediaBlob]): Promise<ResponseType>;
  mset(keyValuePairs: [string, MediaBlob][]): Promise<void>;
  abstract buildGetMetadataConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, ResponseType, AuthOptions>;
  _getMetadata(key: string): Promise<Record<string, unknown>>;
  abstract buildGetDataConnection(key: string): GoogleDownloadRawConnection<AsyncCallerCallOptions, AuthOptions>;
  _getData(key: string): Promise<Blob>;
  _getMimetypeFromMetadata(metadata: Record<string, unknown>): string;
  _get(key: string): Promise<MediaBlob | undefined>;
  mget(keys: string[]): Promise<(MediaBlob | undefined)[]>;
  abstract buildDeleteConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, GoogleResponse, AuthOptions>;
  _del(key: string): Promise<void>;
  mdelete(keys: string[]): Promise<void>;
  yieldKeys(_prefix: string | undefined): AsyncGenerator<string>;
}
/**
 * Based on https://cloud.google.com/storage/docs/json_api/v1/objects#resource
 */
interface GoogleCloudStorageObject extends Record<string, unknown> {
  id?: string;
  name?: string;
  contentType?: string;
  metadata?: Record<string, unknown>;
}
interface GoogleCloudStorageResponse extends GoogleResponse {
  data: GoogleCloudStorageObject;
}
type BucketAndPath = {
  bucket: string;
  path: string;
};
declare class GoogleCloudStorageUri {
  static uriRegexp: RegExp;
  bucket: string;
  path: string;
  constructor(uri: string);
  get uri(): string;
  get isValid(): boolean;
  static uriToBucketAndPath(uri: string): BucketAndPath;
  static isValidUri(uri: string): boolean;
}
interface GoogleCloudStorageConnectionParams {
  uri: string;
}
interface GoogleCloudStorageUploadConnectionParams<AuthOptions> extends GoogleUploadConnectionParams<AuthOptions>, GoogleCloudStorageConnectionParams {}
declare class GoogleCloudStorageUploadConnection<AuthOptions> extends GoogleMultipartUploadConnection<AsyncCallerCallOptions, GoogleCloudStorageResponse, AuthOptions> {
  uri: GoogleCloudStorageUri;
  constructor(fields: GoogleCloudStorageUploadConnectionParams<AuthOptions>, caller: AsyncCaller, client: GoogleAbstractedClient);
  buildUrl(): Promise<string>;
}
interface GoogleCloudStorageDownloadConnectionParams<AuthOptions> extends GoogleCloudStorageConnectionParams, GoogleConnectionParams<AuthOptions> {
  method: GoogleAbstractedClientOpsMethod;
  alt: "media" | undefined;
}
declare class GoogleCloudStorageDownloadConnection<ResponseType extends GoogleResponse, AuthOptions> extends GoogleDownloadConnection<AsyncCallerCallOptions, ResponseType, AuthOptions> {
  uri: GoogleCloudStorageUri;
  method: GoogleAbstractedClientOpsMethod;
  alt: "media" | undefined;
  constructor(fields: GoogleCloudStorageDownloadConnectionParams<AuthOptions>, caller: AsyncCaller, client: GoogleAbstractedClient);
  buildMethod(): GoogleAbstractedClientOpsMethod;
  buildUrl(): Promise<string>;
}
interface GoogleCloudStorageRawConnectionParams<AuthOptions> extends GoogleCloudStorageConnectionParams, GoogleConnectionParams<AuthOptions> {}
declare class GoogleCloudStorageRawConnection<AuthOptions> extends GoogleDownloadRawConnection<AsyncCallerCallOptions, AuthOptions> {
  uri: GoogleCloudStorageUri;
  constructor(fields: GoogleCloudStorageRawConnectionParams<AuthOptions>, caller: AsyncCaller, client: GoogleAbstractedClient);
  buildUrl(): Promise<string>;
}
interface BlobStoreGoogleCloudStorageBaseParams<AuthOptions> extends BlobStoreGoogleParams<AuthOptions> {
  uriPrefix: GoogleCloudStorageUri;
}
declare abstract class BlobStoreGoogleCloudStorageBase<AuthOptions> extends BlobStoreGoogle<GoogleCloudStorageResponse, AuthOptions> {
  params: BlobStoreGoogleCloudStorageBaseParams<AuthOptions>;
  constructor(fields: BlobStoreGoogleCloudStorageBaseParams<AuthOptions>);
  buildSetConnection([key, _blob]: [string, MediaBlob]): GoogleMultipartUploadConnection<AsyncCallerCallOptions, GoogleCloudStorageResponse, AuthOptions>;
  buildSetMetadata([key, blob]: [string, MediaBlob]): Record<string, unknown>;
  buildGetMetadataConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, GoogleCloudStorageResponse, AuthOptions>;
  buildGetDataConnection(key: string): GoogleDownloadRawConnection<AsyncCallerCallOptions, AuthOptions>;
  buildDeleteConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, GoogleResponse, AuthOptions>;
}
type AIStudioFileState = "PROCESSING" | "ACTIVE" | "FAILED" | "STATE_UNSPECIFIED";
type AIStudioFileVideoMetadata = {
  videoMetadata: {
    videoDuration: string;
  };
};
type AIStudioFileMetadata = AIStudioFileVideoMetadata;
interface AIStudioFileObject {
  name?: string;
  displayName?: string;
  mimeType?: string;
  sizeBytes?: string;
  createTime?: string;
  updateTime?: string;
  expirationTime?: string;
  sha256Hash?: string;
  uri?: string;
  state?: AIStudioFileState;
  error?: {
    code: number;
    message: string;
    details: Record<string, unknown>[];
  };
  metadata?: AIStudioFileMetadata;
}
declare class AIStudioMediaBlob extends MediaBlob {
  _valueAsDate(value: string): Date;
  _metadataFieldAsDate(field: string): Date;
  get createDate(): Date;
  get updateDate(): Date;
  get expirationDate(): Date;
  get isExpired(): boolean;
}
interface AIStudioFileGetResponse extends GoogleResponse {
  data: AIStudioFileObject;
}
interface AIStudioFileSaveResponse extends GoogleResponse {
  data: {
    file: AIStudioFileObject;
  };
}
interface AIStudioFileListResponse extends GoogleResponse {
  data: {
    files: AIStudioFileObject[];
    nextPageToken: string;
  };
}
type AIStudioFileResponse = AIStudioFileGetResponse | AIStudioFileSaveResponse | AIStudioFileListResponse;
interface AIStudioFileConnectionParams {}
interface AIStudioFileUploadConnectionParams<AuthOptions> extends GoogleUploadConnectionParams<AuthOptions>, AIStudioFileConnectionParams {}
declare class AIStudioFileUploadConnection<AuthOptions> extends GoogleMultipartUploadConnection<AsyncCallerCallOptions, AIStudioFileSaveResponse, AuthOptions> {
  get computedApiVersion(): string;
  buildUrl(): Promise<string>;
}
interface AIStudioFileDownloadConnectionParams<AuthOptions> extends AIStudioFileConnectionParams, GoogleConnectionParams<AuthOptions> {
  method: GoogleAbstractedClientOpsMethod;
  name: string;
}
declare class AIStudioFileDownloadConnection<ResponseType extends GoogleResponse, AuthOptions> extends GoogleDownloadConnection<AsyncCallerCallOptions, ResponseType, AuthOptions> {
  method: GoogleAbstractedClientOpsMethod;
  name: string;
  constructor(fields: AIStudioFileDownloadConnectionParams<AuthOptions>, caller: AsyncCaller, client: GoogleAbstractedClient);
  get computedApiVersion(): string;
  buildMethod(): GoogleAbstractedClientOpsMethod;
  buildUrl(): Promise<string>;
}
interface BlobStoreAIStudioFileBaseParams<AuthOptions> extends BlobStoreGoogleParams<AuthOptions> {
  retryTime?: number;
}
declare abstract class BlobStoreAIStudioFileBase<AuthOptions> extends BlobStoreGoogle<AIStudioFileResponse, AuthOptions> {
  params?: BlobStoreAIStudioFileBaseParams<AuthOptions>;
  retryTime: number;
  constructor(fields?: BlobStoreAIStudioFileBaseParams<AuthOptions>);
  _pathToName(path: string): string;
  abstract buildAbstractedClient(fields?: BlobStoreGoogleParams<AuthOptions>): GoogleAbstractedClient;
  buildApiKeyClient(apiKey: string): GoogleAbstractedClient;
  buildApiKey(fields?: BlobStoreGoogleParams<AuthOptions>): string | undefined;
  buildClient(fields?: BlobStoreGoogleParams<AuthOptions>): GoogleAbstractedClient;
  _regetMetadata(key: string): Promise<AIStudioFileObject>;
  _set([key, blob]: [string, MediaBlob]): Promise<AIStudioFileSaveResponse>;
  buildSetConnection([_key, _blob]: [string, MediaBlob]): GoogleMultipartUploadConnection<AsyncCallerCallOptions, AIStudioFileResponse, AuthOptions>;
  buildSetMetadata([_key, _blob]: [string, MediaBlob]): Record<string, unknown>;
  buildGetMetadataConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, AIStudioFileResponse, AuthOptions>;
  buildGetDataConnection(_key: string): GoogleDownloadRawConnection<AsyncCallerCallOptions, AuthOptions>;
  _get(key: string): Promise<MediaBlob | undefined>;
  buildDeleteConnection(key: string): GoogleDownloadConnection<AsyncCallerCallOptions, AIStudioFileResponse, AuthOptions>;
}
//#endregion
export { AIStudioFileConnectionParams, AIStudioFileDownloadConnection, AIStudioFileDownloadConnectionParams, AIStudioFileGetResponse, AIStudioFileListResponse, AIStudioFileMetadata, AIStudioFileObject, AIStudioFileResponse, AIStudioFileSaveResponse, AIStudioFileState, AIStudioFileUploadConnection, AIStudioFileUploadConnectionParams, AIStudioFileVideoMetadata, AIStudioMediaBlob, BlobStoreAIStudioFileBase, BlobStoreAIStudioFileBaseParams, BlobStoreGoogle, BlobStoreGoogleCloudStorageBase, BlobStoreGoogleCloudStorageBaseParams, BlobStoreGoogleParams, BucketAndPath, GoogleCloudStorageConnectionParams, GoogleCloudStorageDownloadConnection, GoogleCloudStorageDownloadConnectionParams, GoogleCloudStorageObject, GoogleCloudStorageRawConnection, GoogleCloudStorageRawConnectionParams, GoogleCloudStorageResponse, GoogleCloudStorageUploadConnection, GoogleCloudStorageUploadConnectionParams, GoogleCloudStorageUri, GoogleDownloadConnection, GoogleDownloadRawConnection, GoogleMultipartUploadConnection, GoogleUploadConnectionParams };
//# sourceMappingURL=media.d.cts.map