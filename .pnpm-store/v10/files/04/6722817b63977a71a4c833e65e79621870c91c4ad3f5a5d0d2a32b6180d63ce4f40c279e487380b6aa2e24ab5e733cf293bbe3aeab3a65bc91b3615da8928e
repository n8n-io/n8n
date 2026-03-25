/**
 * This file was automatically generated. DO NOT MODIFY IT BY HAND.
 */
import { LogNormal, Uniform } from './delay-distribution.model';
export declare type ResponseDefinition = (LogNormal | Uniform) & {
    /**
     * The HTTP status code to be returned
     */
    status?: number;
    /**
     * The HTTP status message to be returned
     */
    statusMessage?: string;
    /**
     * Map of response headers to send
     */
    headers?: {
        [k: string]: any;
    };
    /**
     * Extra request headers to send when proxying to another host.
     */
    additionalProxyRequestHeaders?: {
        [k: string]: any;
    };
    /**
     * The response body as a string. Only one of body, base64Body, jsonBody or bodyFileName may be
     * specified.
     */
    body?: string;
    /**
     * The response body as a base64 encoded string (useful for binary content). Only one of body,
     * base64Body, jsonBody or bodyFileName may be specified.
     */
    base64Body?: string;
    /**
     * The response body as a JSON object. Only one of body, base64Body, jsonBody or bodyFileName may
     * be specified.
     */
    jsonBody?: {
        [k: string]: any;
    };
    /**
     * The path to the file containing the response body, relative to the configured file root. Only
     * one of body, base64Body, jsonBody or bodyFileName may be specified.
     */
    bodyFileName?: string;
    /**
     * The fault to apply (instead of a full, valid response).
     */
    fault?: 'CONNECTION_RESET_BY_PEER' | 'EMPTY_RESPONSE' | 'MALFORMED_RESPONSE_CHUNK' | 'RANDOM_DATA_THEN_CLOSE';
    /**
     * Number of milliseconds to delay be before sending the response.
     */
    fixedDelayMilliseconds?: number;
    /**
     * Read-only flag indicating false if this was the default, unmatched response. Not present
     * otherwise.
     */
    fromConfiguredStub?: boolean;
    /**
     * The base URL of the target to proxy matching requests to.
     */
    proxyBaseUrl?: string;
    /**
     * Parameters to apply to response transformers.
     */
    transformerParameters?: {
        [k: string]: any;
    };
    /**
     * List of names of transformers to apply to this response.
     */
    transformers?: string[];
    [k: string]: any;
};
