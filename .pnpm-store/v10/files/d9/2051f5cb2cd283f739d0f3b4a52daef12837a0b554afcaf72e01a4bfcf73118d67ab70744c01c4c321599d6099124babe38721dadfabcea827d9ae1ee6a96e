import { type CallContext, type CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "grpc.health.v1";
export interface HealthCheckRequest {
    service: string;
}
export interface HealthCheckResponse {
    status: HealthCheckResponse_ServingStatus;
}
export declare enum HealthCheckResponse_ServingStatus {
    UNKNOWN = 0,
    SERVING = 1,
    NOT_SERVING = 2,
    /** SERVICE_UNKNOWN - Used only by the Watch method. */
    SERVICE_UNKNOWN = 3,
    UNRECOGNIZED = -1
}
export declare function healthCheckResponse_ServingStatusFromJSON(object: any): HealthCheckResponse_ServingStatus;
export declare function healthCheckResponse_ServingStatusToJSON(object: HealthCheckResponse_ServingStatus): string;
export declare const HealthCheckRequest: {
    encode(message: HealthCheckRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckRequest;
    fromJSON(object: any): HealthCheckRequest;
    toJSON(message: HealthCheckRequest): unknown;
    create(base?: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
    fromPartial(object: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
};
export declare const HealthCheckResponse: {
    encode(message: HealthCheckResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckResponse;
    fromJSON(object: any): HealthCheckResponse;
    toJSON(message: HealthCheckResponse): unknown;
    create(base?: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
    fromPartial(object: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
};
export type HealthDefinition = typeof HealthDefinition;
export declare const HealthDefinition: {
    readonly name: "Health";
    readonly fullName: "grpc.health.v1.Health";
    readonly methods: {
        /**
         * If the requested service is unknown, the call will fail with status
         * NOT_FOUND.
         */
        readonly check: {
            readonly name: "Check";
            readonly requestType: {
                encode(message: HealthCheckRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckRequest;
                fromJSON(object: any): HealthCheckRequest;
                toJSON(message: HealthCheckRequest): unknown;
                create(base?: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
                fromPartial(object: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: HealthCheckResponse, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckResponse;
                fromJSON(object: any): HealthCheckResponse;
                toJSON(message: HealthCheckResponse): unknown;
                create(base?: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
                fromPartial(object: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        /**
         * Performs a watch for the serving status of the requested service.
         * The server will immediately send back a message indicating the current
         * serving status.  It will then subsequently send a new message whenever
         * the service's serving status changes.
         *
         * If the requested service is unknown when the call is received, the
         * server will send a message setting the serving status to
         * SERVICE_UNKNOWN but will *not* terminate the call.  If at some
         * future point, the serving status of the service becomes known, the
         * server will send a new message with the service's serving status.
         *
         * If the call terminates with status UNIMPLEMENTED, then clients
         * should assume this method is not supported and should not retry the
         * call.  If the call terminates with any other status (including OK),
         * clients should retry the call with appropriate exponential backoff.
         */
        readonly watch: {
            readonly name: "Watch";
            readonly requestType: {
                encode(message: HealthCheckRequest, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckRequest;
                fromJSON(object: any): HealthCheckRequest;
                toJSON(message: HealthCheckRequest): unknown;
                create(base?: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
                fromPartial(object: DeepPartial<HealthCheckRequest>): HealthCheckRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: HealthCheckResponse, writer?: _m0.Writer): _m0.Writer;
                decode(input: _m0.Reader | Uint8Array, length?: number): HealthCheckResponse;
                fromJSON(object: any): HealthCheckResponse;
                toJSON(message: HealthCheckResponse): unknown;
                create(base?: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
                fromPartial(object: DeepPartial<HealthCheckResponse>): HealthCheckResponse;
            };
            readonly responseStream: true;
            readonly options: {};
        };
    };
};
export interface HealthServiceImplementation<CallContextExt = {}> {
    /**
     * If the requested service is unknown, the call will fail with status
     * NOT_FOUND.
     */
    check(request: HealthCheckRequest, context: CallContext & CallContextExt): Promise<DeepPartial<HealthCheckResponse>>;
    /**
     * Performs a watch for the serving status of the requested service.
     * The server will immediately send back a message indicating the current
     * serving status.  It will then subsequently send a new message whenever
     * the service's serving status changes.
     *
     * If the requested service is unknown when the call is received, the
     * server will send a message setting the serving status to
     * SERVICE_UNKNOWN but will *not* terminate the call.  If at some
     * future point, the serving status of the service becomes known, the
     * server will send a new message with the service's serving status.
     *
     * If the call terminates with status UNIMPLEMENTED, then clients
     * should assume this method is not supported and should not retry the
     * call.  If the call terminates with any other status (including OK),
     * clients should retry the call with appropriate exponential backoff.
     */
    watch(request: HealthCheckRequest, context: CallContext & CallContextExt): ServerStreamingMethodResult<DeepPartial<HealthCheckResponse>>;
}
export interface HealthClient<CallOptionsExt = {}> {
    /**
     * If the requested service is unknown, the call will fail with status
     * NOT_FOUND.
     */
    check(request: DeepPartial<HealthCheckRequest>, options?: CallOptions & CallOptionsExt): Promise<HealthCheckResponse>;
    /**
     * Performs a watch for the serving status of the requested service.
     * The server will immediately send back a message indicating the current
     * serving status.  It will then subsequently send a new message whenever
     * the service's serving status changes.
     *
     * If the requested service is unknown when the call is received, the
     * server will send a message setting the serving status to
     * SERVICE_UNKNOWN but will *not* terminate the call.  If at some
     * future point, the serving status of the service becomes known, the
     * server will send a new message with the service's serving status.
     *
     * If the call terminates with status UNIMPLEMENTED, then clients
     * should assume this method is not supported and should not retry the
     * call.  If the call terminates with any other status (including OK),
     * clients should retry the call with appropriate exponential backoff.
     */
    watch(request: DeepPartial<HealthCheckRequest>, options?: CallOptions & CallOptionsExt): AsyncIterable<HealthCheckResponse>;
}
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export type ServerStreamingMethodResult<Response> = {
    [Symbol.asyncIterator](): AsyncIterator<Response, void>;
};
export {};
