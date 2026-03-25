import type { ClientErrorStatusCode, ContentfulStatusCode, ServerErrorStatusCode } from '../utils/http-status';
import { DetailedError } from './fetch-result-please';
import type { ClientResponse, FilterClientResponseByStatusCode } from './types';
export { DetailedError };
export declare const mergePath: (base: string, path: string) => string;
export declare const replaceUrlParam: (urlString: string, params: Record<string, string | undefined>) => string;
export declare const buildSearchParams: (query: Record<string, string | string[]>) => URLSearchParams;
export declare const replaceUrlProtocol: (urlString: string, protocol: "ws" | "http") => string;
export declare const removeIndexString: (urlString: string) => string;
export declare function deepMerge<T>(target: T, source: Record<string, unknown>): T;
/**
 * Shortcut to get a consumable response from `hc`'s fetch calls (Response), with types inference.
 *
 * Smartly parse the response data, throwing a structured error if the response is not `ok`. ({@link DetailedError})
 *
 * @example const result = await parseResponse(client.posts.$get())
 */
export declare function parseResponse<T extends ClientResponse<any>>(fetchRes: T | Promise<T>): Promise<FilterClientResponseByStatusCode<T, Exclude<ContentfulStatusCode, ClientErrorStatusCode | ServerErrorStatusCode>> extends never ? undefined : FilterClientResponseByStatusCode<T, Exclude<ContentfulStatusCode, ClientErrorStatusCode | ServerErrorStatusCode>> extends ClientResponse<infer RT, infer _, infer RF> ? RF extends 'json' ? RT : RT extends string ? RT : string : undefined>;
