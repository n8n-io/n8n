import { HttpRequest } from "@smithy/types";
import { ClientRequest } from "http";
import { ClientHttp2Stream } from "http2";
/**
 * This resolves when writeBody has been called.
 *
 * @param httpRequest - opened Node.js request.
 * @param request - container with the request body.
 * @param maxContinueTimeoutMs - time to wait for the continue event.
 * @param externalAgent - whether agent is owned by caller code.
 */
export declare function writeRequestBody(httpRequest: ClientRequest | ClientHttp2Stream, request: HttpRequest, maxContinueTimeoutMs?: number, externalAgent?: boolean): Promise<void>;
