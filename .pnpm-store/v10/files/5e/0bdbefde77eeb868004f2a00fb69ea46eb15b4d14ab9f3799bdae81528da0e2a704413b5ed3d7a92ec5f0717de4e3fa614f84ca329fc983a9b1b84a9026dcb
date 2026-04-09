/// <reference types="node" />
/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import { ExportResponse } from '../export-response';
/**
 * Sends data using http
 * @param request
 * @param url
 * @param headers
 * @param compression
 * @param userAgent
 * @param agent
 * @param data
 * @param onDone
 * @param timeoutMillis
 */
export declare function sendWithHttp(request: typeof https.request | typeof http.request, url: string, headers: Record<string, string>, compression: 'gzip' | 'none', userAgent: string | undefined, agent: http.Agent | https.Agent, data: Uint8Array, onDone: (response: ExportResponse) => void, timeoutMillis: number): void;
export declare function compressAndSend(req: http.ClientRequest, compression: 'gzip' | 'none', data: Uint8Array, onError: (error: Error) => void): void;
//# sourceMappingURL=http-transport-utils.d.ts.map