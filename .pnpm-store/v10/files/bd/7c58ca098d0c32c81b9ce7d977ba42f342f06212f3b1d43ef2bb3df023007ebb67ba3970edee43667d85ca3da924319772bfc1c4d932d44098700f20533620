/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import { ExportResponse } from '../../export-response';
export declare type sendWithHttp = (params: HttpRequestParameters, agent: http.Agent | https.Agent, data: Uint8Array, onDone: (response: ExportResponse) => void, timeoutMillis: number) => void;
export interface HttpRequestParameters {
    url: string;
    headers: Record<string, string>;
    compression: 'gzip' | 'none';
    agentOptions: http.AgentOptions | https.AgentOptions;
}
//# sourceMappingURL=http-transport-types.d.ts.map