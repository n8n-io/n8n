import type { AbsoluteLocation, FinalizeHandler, FinalizeRequestHandlerOptions, HandlerExecutionContext, MetadataBearer, Pluggable } from "@smithy/types";
import type { RetryResolvedConfig } from "./configurations";
/**
 * @internal
 */
export declare const retryMiddleware: (options: RetryResolvedConfig) => <Output extends MetadataBearer = MetadataBearer>(next: FinalizeHandler<any, Output>, context: HandlerExecutionContext) => FinalizeHandler<any, Output>;
/**
 * @internal
 */
export declare const retryMiddlewareOptions: FinalizeRequestHandlerOptions & AbsoluteLocation;
/**
 * @internal
 */
export declare const getRetryPlugin: (options: RetryResolvedConfig) => Pluggable<any, any>;
/**
 * @internal
 */
export declare const getRetryAfterHint: (response: unknown) => Date | undefined;
