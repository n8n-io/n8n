import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "weaviate.v1";
export interface WeaviateHealthCheckRequest {
    service: string;
}
/**
 * keep compatibility with google health check
 * protolint:disable ENUM_FIELD_NAMES_PREFIX
 * protolint:disable ENUM_FIELD_NAMES_ZERO_VALUE_END_WITH
 */
export interface WeaviateHealthCheckResponse {
    status: WeaviateHealthCheckResponse_ServingStatus;
}
export declare enum WeaviateHealthCheckResponse_ServingStatus {
    UNKNOWN = 0,
    SERVING = 1,
    NOT_SERVING = 2,
    UNRECOGNIZED = -1
}
export declare function weaviateHealthCheckResponse_ServingStatusFromJSON(object: any): WeaviateHealthCheckResponse_ServingStatus;
export declare function weaviateHealthCheckResponse_ServingStatusToJSON(object: WeaviateHealthCheckResponse_ServingStatus): string;
export declare const WeaviateHealthCheckRequest: {
    encode(message: WeaviateHealthCheckRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): WeaviateHealthCheckRequest;
    fromJSON(object: any): WeaviateHealthCheckRequest;
    toJSON(message: WeaviateHealthCheckRequest): unknown;
    create(base?: DeepPartial<WeaviateHealthCheckRequest>): WeaviateHealthCheckRequest;
    fromPartial(object: DeepPartial<WeaviateHealthCheckRequest>): WeaviateHealthCheckRequest;
};
export declare const WeaviateHealthCheckResponse: {
    encode(message: WeaviateHealthCheckResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): WeaviateHealthCheckResponse;
    fromJSON(object: any): WeaviateHealthCheckResponse;
    toJSON(message: WeaviateHealthCheckResponse): unknown;
    create(base?: DeepPartial<WeaviateHealthCheckResponse>): WeaviateHealthCheckResponse;
    fromPartial(object: DeepPartial<WeaviateHealthCheckResponse>): WeaviateHealthCheckResponse;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export {};
