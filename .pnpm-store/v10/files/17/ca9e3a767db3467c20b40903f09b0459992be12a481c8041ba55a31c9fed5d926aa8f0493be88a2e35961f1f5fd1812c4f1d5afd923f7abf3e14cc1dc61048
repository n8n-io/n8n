import type { InitializeHandlerOptions, InitializeMiddleware } from "@smithy/types";
/**
 * Most WebSocket operations contains `SessionId` parameter in both input and
 * output, with the same value. This middleware populates the `SessionId`
 * parameter from request to the response. This is necessary because in
 * WebSocket, the SDK cannot access any parameters other than the response
 * stream. So we fake response parameter.
 */
export declare const injectSessionIdMiddleware: () => InitializeMiddleware<any, any>;
export declare const injectSessionIdMiddlewareOptions: InitializeHandlerOptions;
