import type { Breadcrumb, FetchBreadcrumbData } from '@sentry/core';
import type { FetchHint } from '@sentry-internal/browser-utils';
import type { ReplayContainer, ReplayNetworkOptions, ReplayNetworkRequestOrResponse } from '../../types';
/**
 * Capture a fetch breadcrumb to a replay.
 * This adds additional data (where appropriate).
 */
export declare function captureFetchBreadcrumbToReplay(breadcrumb: Breadcrumb & {
    data: FetchBreadcrumbData;
}, hint: Partial<FetchHint>, options: ReplayNetworkOptions & {
    replay: ReplayContainer;
}): Promise<void>;
/**
 * Enrich a breadcrumb with additional data.
 * This has to be sync & mutate the given breadcrumb,
 * as the breadcrumb is afterwards consumed by other handlers.
 */
export declare function enrichFetchBreadcrumb(breadcrumb: Breadcrumb & {
    data: FetchBreadcrumbData;
}, hint: Partial<FetchHint>): void;
/** Exported only for tests. */
export declare function _getResponseInfo(captureDetails: boolean, { networkCaptureBodies, networkResponseHeaders, }: Pick<ReplayNetworkOptions, 'networkCaptureBodies' | 'networkResponseHeaders'>, response: Response | undefined, responseBodySize?: number): Promise<ReplayNetworkRequestOrResponse | undefined>;
//# sourceMappingURL=fetchUtils.d.ts.map