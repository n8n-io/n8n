import type { BuildMiddleware, RelativeMiddlewareOptions, RequestHandler } from "@smithy/types";
/**
 * Middleware that modify the request to from http to WebSocket
 * This middleware can only be applied to commands that supports bi-directional event streaming via WebSocket.
 * Example of headerPrefix is "x-amz-rekognition-streaming-liveness-*" prefix exists for all rekognition streaming
 * websocket API's headers. The common prefix are to be removed when moving them from headers to querystring.
 */
export declare const websocketEndpointMiddleware: (config: {
    requestHandler: RequestHandler<any, any>;
}, options: {
    headerPrefix: string;
}) => BuildMiddleware<any, any>;
export declare const websocketEndpointMiddlewareOptions: RelativeMiddlewareOptions;
