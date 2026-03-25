import { Breadcrumb, BreadcrumbHint } from '@sentry/core';
import { ReplayContainer, ReplayNetworkOptions } from '../types';
interface ExtendedNetworkBreadcrumbsOptions extends ReplayNetworkOptions {
    replay: ReplayContainer;
}
/**
 * This method does two things:
 * - It enriches the regular XHR/fetch breadcrumbs with request/response size data
 * - It captures the XHR/fetch breadcrumbs to the replay
 *   (enriching it with further data that is _not_ added to the regular breadcrumbs)
 */
export declare function handleNetworkBreadcrumbs(replay: ReplayContainer): void;
/** just exported for tests */
export declare function beforeAddNetworkBreadcrumb(options: ExtendedNetworkBreadcrumbsOptions, breadcrumb: Breadcrumb, hint?: BreadcrumbHint): void;
export {};
//# sourceMappingURL=handleNetworkBreadcrumbs.d.ts.map
