import { type CallContext, type CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "weaviate.v1";
export declare enum CompressionType {
    /** COMPRESSION_TYPE_UNSPECIFIED - No compression */
    COMPRESSION_TYPE_UNSPECIFIED = 0,
    /** COMPRESSION_TYPE_GZIP - gzip (compress/gzip) */
    COMPRESSION_TYPE_GZIP = 1,
    /** COMPRESSION_TYPE_ZLIB - zlib (compress/zlib) */
    COMPRESSION_TYPE_ZLIB = 2,
    /** COMPRESSION_TYPE_DEFLATE - raw DEFLATE (compress/flate) */
    COMPRESSION_TYPE_DEFLATE = 3,
    UNRECOGNIZED = -1
}
export declare function compressionTypeFromJSON(object: any): CompressionType;
export declare function compressionTypeToJSON(object: CompressionType): string;
export interface PauseFileActivityRequest {
    indexName: string;
    shardName: string;
    schemaVersion: number;
}
export interface PauseFileActivityResponse {
    indexName: string;
    shardName: string;
}
export interface ResumeFileActivityRequest {
    indexName: string;
    shardName: string;
}
export interface ResumeFileActivityResponse {
    indexName: string;
    shardName: string;
}
export interface ListFilesRequest {
    indexName: string;
    shardName: string;
}
export interface ListFilesResponse {
    indexName: string;
    shardName: string;
    fileNames: string[];
}
export interface GetFileMetadataRequest {
    indexName: string;
    shardName: string;
    fileName: string;
}
export interface FileMetadata {
    indexName: string;
    shardName: string;
    fileName: string;
    size: number;
    crc32: number;
}
export interface GetFileRequest {
    indexName: string;
    shardName: string;
    fileName: string;
    /** Requested compression algorithm for streamed chunks */
    compression: CompressionType;
}
export interface FileChunk {
    /** Byte offset in the uncompressed file */
    offset: number;
    /** Compressed or raw chunk data */
    data: Uint8Array;
    /** Indicates final chunk */
    eof: boolean;
}
export declare const PauseFileActivityRequest: {
    encode(message: PauseFileActivityRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PauseFileActivityRequest;
    fromJSON(object: any): PauseFileActivityRequest;
    toJSON(message: PauseFileActivityRequest): unknown;
    create(base?: DeepPartial<PauseFileActivityRequest>): PauseFileActivityRequest;
    fromPartial(object: DeepPartial<PauseFileActivityRequest>): PauseFileActivityRequest;
};
export declare const PauseFileActivityResponse: {
    encode(message: PauseFileActivityResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): PauseFileActivityResponse;
    fromJSON(object: any): PauseFileActivityResponse;
    toJSON(message: PauseFileActivityResponse): unknown;
    create(base?: DeepPartial<PauseFileActivityResponse>): PauseFileActivityResponse;
    fromPartial(object: DeepPartial<PauseFileActivityResponse>): PauseFileActivityResponse;
};
export declare const ResumeFileActivityRequest: {
    encode(message: ResumeFileActivityRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ResumeFileActivityRequest;
    fromJSON(object: any): ResumeFileActivityRequest;
    toJSON(message: ResumeFileActivityRequest): unknown;
    create(base?: DeepPartial<ResumeFileActivityRequest>): ResumeFileActivityRequest;
    fromPartial(object: DeepPartial<ResumeFileActivityRequest>): ResumeFileActivityRequest;
};
export declare const ResumeFileActivityResponse: {
    encode(message: ResumeFileActivityResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ResumeFileActivityResponse;
    fromJSON(object: any): ResumeFileActivityResponse;
    toJSON(message: ResumeFileActivityResponse): unknown;
    create(base?: DeepPartial<ResumeFileActivityResponse>): ResumeFileActivityResponse;
    fromPartial(object: DeepPartial<ResumeFileActivityResponse>): ResumeFileActivityResponse;
};
export declare const ListFilesRequest: {
    encode(message: ListFilesRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ListFilesRequest;
    fromJSON(object: any): ListFilesRequest;
    toJSON(message: ListFilesRequest): unknown;
    create(base?: DeepPartial<ListFilesRequest>): ListFilesRequest;
    fromPartial(object: DeepPartial<ListFilesRequest>): ListFilesRequest;
};
export declare const ListFilesResponse: {
    encode(message: ListFilesResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ListFilesResponse;
    fromJSON(object: any): ListFilesResponse;
    toJSON(message: ListFilesResponse): unknown;
    create(base?: DeepPartial<ListFilesResponse>): ListFilesResponse;
    fromPartial(object: DeepPartial<ListFilesResponse>): ListFilesResponse;
};
export declare const GetFileMetadataRequest: {
    encode(message: GetFileMetadataRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GetFileMetadataRequest;
    fromJSON(object: any): GetFileMetadataRequest;
    toJSON(message: GetFileMetadataRequest): unknown;
    create(base?: DeepPartial<GetFileMetadataRequest>): GetFileMetadataRequest;
    fromPartial(object: DeepPartial<GetFileMetadataRequest>): GetFileMetadataRequest;
};
export declare const FileMetadata: {
    encode(message: FileMetadata, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FileMetadata;
    fromJSON(object: any): FileMetadata;
    toJSON(message: FileMetadata): unknown;
    create(base?: DeepPartial<FileMetadata>): FileMetadata;
    fromPartial(object: DeepPartial<FileMetadata>): FileMetadata;
};
export declare const GetFileRequest: {
    encode(message: GetFileRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GetFileRequest;
    fromJSON(object: any): GetFileRequest;
    toJSON(message: GetFileRequest): unknown;
    create(base?: DeepPartial<GetFileRequest>): GetFileRequest;
    fromPartial(object: DeepPartial<GetFileRequest>): GetFileRequest;
};
export declare const FileChunk: {
    encode(message: FileChunk, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): FileChunk;
    fromJSON(object: any): FileChunk;
    toJSON(message: FileChunk): unknown;
    create(base?: DeepPartial<FileChunk>): FileChunk;
    fromPartial(object: DeepPartial<FileChunk>): FileChunk;
};
export type FileReplicationServiceDefinition = typeof FileReplicationServiceDefinition;
export declare const FileReplicationServiceDefinition: {
    readonly name: "FileReplicationService";
    readonly fullName: "weaviate.v1.FileReplicationService";
    readonly methods: {
        readonly pauseFileActivity: {
            readonly name: "PauseFileActivity";
            readonly requestType: {
                encode(message: PauseFileActivityRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): PauseFileActivityRequest;
                fromJSON(object: any): PauseFileActivityRequest;
                toJSON(message: PauseFileActivityRequest): unknown;
                create(base?: DeepPartial<PauseFileActivityRequest>): PauseFileActivityRequest;
                fromPartial(object: DeepPartial<PauseFileActivityRequest>): PauseFileActivityRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: PauseFileActivityResponse, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): PauseFileActivityResponse;
                fromJSON(object: any): PauseFileActivityResponse;
                toJSON(message: PauseFileActivityResponse): unknown;
                create(base?: DeepPartial<PauseFileActivityResponse>): PauseFileActivityResponse;
                fromPartial(object: DeepPartial<PauseFileActivityResponse>): PauseFileActivityResponse;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly resumeFileActivity: {
            readonly name: "ResumeFileActivity";
            readonly requestType: {
                encode(message: ResumeFileActivityRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): ResumeFileActivityRequest;
                fromJSON(object: any): ResumeFileActivityRequest;
                toJSON(message: ResumeFileActivityRequest): unknown;
                create(base?: DeepPartial<ResumeFileActivityRequest>): ResumeFileActivityRequest;
                fromPartial(object: DeepPartial<ResumeFileActivityRequest>): ResumeFileActivityRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: ResumeFileActivityResponse, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): ResumeFileActivityResponse;
                fromJSON(object: any): ResumeFileActivityResponse;
                toJSON(message: ResumeFileActivityResponse): unknown;
                create(base?: DeepPartial<ResumeFileActivityResponse>): ResumeFileActivityResponse;
                fromPartial(object: DeepPartial<ResumeFileActivityResponse>): ResumeFileActivityResponse;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly listFiles: {
            readonly name: "ListFiles";
            readonly requestType: {
                encode(message: ListFilesRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): ListFilesRequest;
                fromJSON(object: any): ListFilesRequest;
                toJSON(message: ListFilesRequest): unknown;
                create(base?: DeepPartial<ListFilesRequest>): ListFilesRequest;
                fromPartial(object: DeepPartial<ListFilesRequest>): ListFilesRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: ListFilesResponse, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): ListFilesResponse;
                fromJSON(object: any): ListFilesResponse;
                toJSON(message: ListFilesResponse): unknown;
                create(base?: DeepPartial<ListFilesResponse>): ListFilesResponse;
                fromPartial(object: DeepPartial<ListFilesResponse>): ListFilesResponse;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly getFileMetadata: {
            readonly name: "GetFileMetadata";
            readonly requestType: {
                encode(message: GetFileMetadataRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): GetFileMetadataRequest;
                fromJSON(object: any): GetFileMetadataRequest;
                toJSON(message: GetFileMetadataRequest): unknown;
                create(base?: DeepPartial<GetFileMetadataRequest>): GetFileMetadataRequest;
                fromPartial(object: DeepPartial<GetFileMetadataRequest>): GetFileMetadataRequest;
            };
            readonly requestStream: true;
            readonly responseType: {
                encode(message: FileMetadata, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): FileMetadata;
                fromJSON(object: any): FileMetadata;
                toJSON(message: FileMetadata): unknown;
                create(base?: DeepPartial<FileMetadata>): FileMetadata;
                fromPartial(object: DeepPartial<FileMetadata>): FileMetadata;
            };
            readonly responseStream: true;
            readonly options: {};
        };
        readonly getFile: {
            readonly name: "GetFile";
            readonly requestType: {
                encode(message: GetFileRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): GetFileRequest;
                fromJSON(object: any): GetFileRequest;
                toJSON(message: GetFileRequest): unknown;
                create(base?: DeepPartial<GetFileRequest>): GetFileRequest;
                fromPartial(object: DeepPartial<GetFileRequest>): GetFileRequest;
            };
            readonly requestStream: true;
            readonly responseType: {
                encode(message: FileChunk, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): FileChunk;
                fromJSON(object: any): FileChunk;
                toJSON(message: FileChunk): unknown;
                create(base?: DeepPartial<FileChunk>): FileChunk;
                fromPartial(object: DeepPartial<FileChunk>): FileChunk;
            };
            readonly responseStream: true;
            readonly options: {};
        };
    };
};
export interface FileReplicationServiceImplementation<CallContextExt = {}> {
    pauseFileActivity(request: PauseFileActivityRequest, context: CallContext & CallContextExt): Promise<DeepPartial<PauseFileActivityResponse>>;
    resumeFileActivity(request: ResumeFileActivityRequest, context: CallContext & CallContextExt): Promise<DeepPartial<ResumeFileActivityResponse>>;
    listFiles(request: ListFilesRequest, context: CallContext & CallContextExt): Promise<DeepPartial<ListFilesResponse>>;
    getFileMetadata(request: AsyncIterable<GetFileMetadataRequest>, context: CallContext & CallContextExt): ServerStreamingMethodResult<DeepPartial<FileMetadata>>;
    getFile(request: AsyncIterable<GetFileRequest>, context: CallContext & CallContextExt): ServerStreamingMethodResult<DeepPartial<FileChunk>>;
}
export interface FileReplicationServiceClient<CallOptionsExt = {}> {
    pauseFileActivity(request: DeepPartial<PauseFileActivityRequest>, options?: CallOptions & CallOptionsExt): Promise<PauseFileActivityResponse>;
    resumeFileActivity(request: DeepPartial<ResumeFileActivityRequest>, options?: CallOptions & CallOptionsExt): Promise<ResumeFileActivityResponse>;
    listFiles(request: DeepPartial<ListFilesRequest>, options?: CallOptions & CallOptionsExt): Promise<ListFilesResponse>;
    getFileMetadata(request: AsyncIterable<DeepPartial<GetFileMetadataRequest>>, options?: CallOptions & CallOptionsExt): AsyncIterable<FileMetadata>;
    getFile(request: AsyncIterable<DeepPartial<GetFileRequest>>, options?: CallOptions & CallOptionsExt): AsyncIterable<FileChunk>;
}
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export type ServerStreamingMethodResult<Response> = {
    [Symbol.asyncIterator](): AsyncIterator<Response, void>;
};
export {};
