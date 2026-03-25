import { debug } from '@sentry/core';
import type { NetworkMetaWarning } from './types';
export declare const ORIGINAL_REQ_BODY: unique symbol;
/**
 * Serializes FormData.
 *
 * This is a bit simplified, but gives us a decent estimate.
 * This converts e.g. { name: 'Anne Smith', age: 13 } to 'name=Anne+Smith&age=13'.
 *
 */
export declare function serializeFormData(formData: FormData): string;
/** Get the string representation of a body. */
export declare function getBodyString(body: unknown, _debug?: typeof debug): [string | undefined, NetworkMetaWarning?];
/**
 * Parses the fetch arguments to extract the request payload.
 *
 * In case of a Request object, this function attempts to retrieve the original body by looking for a Sentry-patched symbol.
 */
export declare function getFetchRequestArgBody(fetchArgs?: unknown[]): RequestInit['body'] | undefined;
/**
 * Parses XMLHttpRequest response headers into a Record.
 * Extracted from replay internals to be reusable.
 */
export declare function parseXhrResponseHeaders(xhr: XMLHttpRequest): Record<string, string>;
//# sourceMappingURL=networkUtils.d.ts.map