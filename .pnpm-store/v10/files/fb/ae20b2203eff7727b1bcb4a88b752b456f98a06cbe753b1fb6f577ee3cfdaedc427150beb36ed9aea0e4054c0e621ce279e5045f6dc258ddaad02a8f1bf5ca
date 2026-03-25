import type { Client } from '@sentry/core';
import type { WebVitalReportEvent } from './utils';
/**
 * Starts tracking the Largest Contentful Paint on the current page and collects the value once
 *
 * - the page visibility is hidden
 * - a navigation span is started (to stop LCP measurement for SPA soft navigations)
 *
 * Once either of these events triggers, the LCP value is sent as a standalone span and we stop
 * measuring LCP for subsequent routes.
 */
export declare function trackLcpAsStandaloneSpan(client: Client): void;
/**
 * Exported only for testing!
 */
export declare function _sendStandaloneLcpSpan(lcpValue: number, entry: LargestContentfulPaint | undefined, pageloadSpanId: string, reportEvent: WebVitalReportEvent): void;
//# sourceMappingURL=lcp.d.ts.map