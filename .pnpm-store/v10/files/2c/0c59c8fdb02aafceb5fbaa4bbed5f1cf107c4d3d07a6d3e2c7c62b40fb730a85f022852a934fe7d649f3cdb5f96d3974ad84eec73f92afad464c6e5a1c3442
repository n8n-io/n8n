import { Context, Span } from '@opentelemetry/api';
export declare enum RPCType {
    HTTP = "http"
}
declare type HTTPMetadata = {
    type: RPCType.HTTP;
    route?: string;
    span: Span;
};
/**
 * Allows for future rpc metadata to be used with this mechanism
 */
export declare type RPCMetadata = HTTPMetadata;
export declare function setRPCMetadata(context: Context, meta: RPCMetadata): Context;
export declare function deleteRPCMetadata(context: Context): Context;
export declare function getRPCMetadata(context: Context): RPCMetadata | undefined;
export {};
//# sourceMappingURL=rpc-metadata.d.ts.map