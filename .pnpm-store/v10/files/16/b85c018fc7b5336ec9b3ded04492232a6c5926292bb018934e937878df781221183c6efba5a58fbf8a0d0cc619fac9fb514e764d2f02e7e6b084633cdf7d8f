import { Client } from '@sentry/core';
import { WebVitalReportEvent } from './utils';
/**
 * Starts tracking the Cumulative Layout Shift on the current page and collects the value once
 *
 * - the page visibility is hidden
 * - a navigation span is started (to stop CLS measurement for SPA soft navigations)
 *
 * Once either of these events triggers, the CLS value is sent as a standalone span and we stop
 * measuring CLS.
 */
export declare function trackClsAsStandaloneSpan(client: Client): void;
/**
 * Exported only for testing!
 */
export declare function _sendStandaloneClsSpan(clsValue: number, entry: LayoutShift | undefined, pageloadSpanId: string, reportEvent: WebVitalReportEvent): void;
//# sourceMappingURL=cls.d.ts.map
