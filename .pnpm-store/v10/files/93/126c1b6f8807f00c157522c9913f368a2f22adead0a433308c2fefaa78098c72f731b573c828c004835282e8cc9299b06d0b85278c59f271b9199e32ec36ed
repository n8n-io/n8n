import type { NetworkMetaWarning } from '@sentry-internal/browser-utils';
type JsonObject = Record<string, unknown>;
type JsonArray = unknown[];
export type NetworkBody = JsonObject | JsonArray | string;
interface NetworkMeta {
    warnings?: NetworkMetaWarning[];
}
export interface ReplayNetworkRequestOrResponse {
    size?: number;
    body?: NetworkBody;
    headers: Record<string, string>;
    _meta?: NetworkMeta;
}
export {};
//# sourceMappingURL=request.d.ts.map