import type { AuthScheme, RequestHandler, RequestSigner } from "@smithy/types";
/**
 * @public
 */
export interface WebSocketInputConfig {
}
interface PreviouslyResolved {
    signer: (authScheme: AuthScheme) => Promise<RequestSigner>;
    requestHandler: RequestHandler<any, any>;
}
export interface WebSocketResolvedConfig {
    /**
     * Resolved value of input config {@link AwsAuthInputConfig.signer}
     */
    signer: (authScheme: AuthScheme) => Promise<RequestSigner>;
    /**
     * The HTTP handler to use. Fetch in browser and Https in Nodejs.
     */
    requestHandler: RequestHandler<any, any>;
}
export declare const resolveWebSocketConfig: <T>(input: T & WebSocketInputConfig & PreviouslyResolved) => T & WebSocketResolvedConfig;
export {};
