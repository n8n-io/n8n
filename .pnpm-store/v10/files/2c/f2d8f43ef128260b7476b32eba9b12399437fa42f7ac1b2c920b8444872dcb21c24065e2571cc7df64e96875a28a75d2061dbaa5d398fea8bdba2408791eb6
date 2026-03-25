import { HTTPClient } from "./http.js";
import { Logger } from "./logger.js";
import { RetryConfig } from "./retries.js";
/**
 * EU Production server
 */
export declare const ServerEu = "eu";
/**
 * Contains the list of servers available to the SDK
 */
export declare const ServerList: {
    readonly eu: "https://api.mistral.ai";
};
export type SDKOptions = {
    apiKey?: string | (() => Promise<string>) | undefined;
    httpClient?: HTTPClient;
    /**
     * Allows overriding the default server used by the SDK
     */
    server?: keyof typeof ServerList | undefined;
    /**
     * Allows overriding the default server URL used by the SDK
     */
    serverURL?: string | undefined;
    /**
     * Allows overriding the default user agent used by the SDK
     */
    userAgent?: string | undefined;
    /**
     * Allows overriding the default retry config used by the SDK
     */
    retryConfig?: RetryConfig;
    timeoutMs?: number;
    debugLogger?: Logger;
};
export declare function serverURLFromOptions(options: SDKOptions): URL | null;
export declare const SDK_METADATA: {
    readonly language: "typescript";
    readonly openapiDocVersion: "1.0.0";
    readonly sdkVersion: "1.10.0";
    readonly genVersion: "2.687.13";
    readonly userAgent: "speakeasy-sdk/typescript 1.10.0 2.687.13 1.0.0 @mistralai/mistralai";
};
//# sourceMappingURL=config.d.ts.map