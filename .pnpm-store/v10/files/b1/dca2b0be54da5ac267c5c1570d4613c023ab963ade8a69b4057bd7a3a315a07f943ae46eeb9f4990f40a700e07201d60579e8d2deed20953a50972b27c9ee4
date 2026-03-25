/**
 * Vendored from https://github.com/open-telemetry/opentelemetry-js-contrib/blob/28e209a9da36bc4e1f8c2b0db7360170ed46cb80/plugins/node/instrumentation-undici/src/types.ts
 */
export interface UndiciRequest {
    origin: string;
    method: string;
    path: string;
    /**
     * Serialized string of headers in the form `name: value\r\n` for v5
     * Array of strings v6
     */
    headers: string | string[];
    /**
     * Helper method to add headers (from v6)
     */
    addHeader: (name: string, value: string) => void;
    throwOnError: boolean;
    completed: boolean;
    aborted: boolean;
    idempotent: boolean;
    contentLength: number | null;
    contentType: string | null;
    body: unknown;
}
export interface UndiciResponse {
    headers: Buffer[];
    statusCode: number;
    statusText: string;
}
//# sourceMappingURL=types.d.ts.map