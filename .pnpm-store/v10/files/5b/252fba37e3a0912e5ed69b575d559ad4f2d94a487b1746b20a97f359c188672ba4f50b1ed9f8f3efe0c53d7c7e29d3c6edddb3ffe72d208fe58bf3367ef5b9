import _m0 from "protobufjs/minimal.js";
import { ConsistencyLevel, Filters } from "./base.js";
export declare const protobufPackage = "weaviate.v1";
export interface BatchDeleteRequest {
    collection: string;
    filters: Filters | undefined;
    verbose: boolean;
    dryRun: boolean;
    consistencyLevel?: ConsistencyLevel | undefined;
    tenant?: string | undefined;
}
export interface BatchDeleteReply {
    took: number;
    failed: number;
    matches: number;
    successful: number;
    objects: BatchDeleteObject[];
}
export interface BatchDeleteObject {
    uuid: Uint8Array;
    successful: boolean;
    /** empty string means no error */
    error?: string | undefined;
}
export declare const BatchDeleteRequest: {
    encode(message: BatchDeleteRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchDeleteRequest;
    fromJSON(object: any): BatchDeleteRequest;
    toJSON(message: BatchDeleteRequest): unknown;
    create(base?: DeepPartial<BatchDeleteRequest>): BatchDeleteRequest;
    fromPartial(object: DeepPartial<BatchDeleteRequest>): BatchDeleteRequest;
};
export declare const BatchDeleteReply: {
    encode(message: BatchDeleteReply, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchDeleteReply;
    fromJSON(object: any): BatchDeleteReply;
    toJSON(message: BatchDeleteReply): unknown;
    create(base?: DeepPartial<BatchDeleteReply>): BatchDeleteReply;
    fromPartial(object: DeepPartial<BatchDeleteReply>): BatchDeleteReply;
};
export declare const BatchDeleteObject: {
    encode(message: BatchDeleteObject, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BatchDeleteObject;
    fromJSON(object: any): BatchDeleteObject;
    toJSON(message: BatchDeleteObject): unknown;
    create(base?: DeepPartial<BatchDeleteObject>): BatchDeleteObject;
    fromPartial(object: DeepPartial<BatchDeleteObject>): BatchDeleteObject;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
