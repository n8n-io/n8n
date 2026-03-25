import type { Breadcrumb, XhrBreadcrumbData } from '@sentry/core';
import type { NetworkMetaWarning, XhrHint } from '@sentry-internal/browser-utils';
import type { ReplayContainer, ReplayNetworkOptions } from '../../types';
/**
 * Capture an XHR breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
export declare function captureXhrBreadcrumbToReplay(breadcrumb: Breadcrumb & {
    data: XhrBreadcrumbData;
}, hint: Partial<XhrHint>, options: ReplayNetworkOptions & {
    replay: ReplayContainer;
}): Promise<void>;
/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
export declare function enrichXhrBreadcrumb(breadcrumb: Breadcrumb & {
    data: XhrBreadcrumbData;
}, hint: Partial<XhrHint>): void;
/**
 * Get the string representation of the XHR response.
 * Based on MDN, these are the possible types of the response:
 * string
 * ArrayBuffer
 * Blob
 * Document
 * POJO
 *
 * Exported only for tests.
 */
export declare function _parseXhrResponse(body: XMLHttpRequest['response'], responseType: XMLHttpRequest['responseType']): [string | undefined, NetworkMetaWarning?];
//# sourceMappingURL=xhrUtils.d.ts.map