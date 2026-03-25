/// <reference types="node" />
/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import { HttpRequestParameters } from './http-transport-types';
import { ExportResponse } from '../export-response';
/**
 * Sends data using http
 * @param requestFunction
 * @param params
 * @param agent
 * @param data
 * @param onDone
 * @param timeoutMillis
 */
export declare function sendWithHttp(request: typeof https.request | typeof http.request, params: HttpRequestParameters, agent: http.Agent | https.Agent, data: Uint8Array, onDone: (response: ExportResponse) => void, timeoutMillis: number): void;
export declare function compressAndSend(req: http.ClientRequest, compression: 'gzip' | 'none', data: Uint8Array, onError: (error: Error) => void): void;
//# sourceMappingURL=http-transport-utils.d.ts.map