import { AuthScheme, RequestHandler, RequestSigner } from "@smithy/types";
export interface WebSocketInputConfig {}
interface PreviouslyResolved {
  signer: (authScheme: AuthScheme) => Promise<RequestSigner>;
  requestHandler: RequestHandler<any, any>;
}
export interface WebSocketResolvedConfig {
  signer: (authScheme: AuthScheme) => Promise<RequestSigner>;
  requestHandler: RequestHandler<any, any>;
}
export declare const resolveWebSocketConfig: <T>(
  input: T & WebSocketInputConfig & PreviouslyResolved
) => T & WebSocketResolvedConfig;
export {};
