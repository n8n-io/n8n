import type { Event } from '@sentry/core';
export type SpotlightConnectionOptions = {
    /**
     * Set this if the Spotlight Sidecar is not running on localhost:8969
     * By default, the Url is set to http://localhost:8969/stream
     */
    sidecarUrl?: string;
};
export declare const INTEGRATION_NAME = "SpotlightBrowser";
/**
 * Use this integration to send errors and transactions to Spotlight.
 *
 * Learn more about spotlight at https://spotlightjs.com
 */
export declare const spotlightBrowserIntegration: (options?: Partial<SpotlightConnectionOptions> | undefined) => import("@sentry/core").Integration;
/**
 * Flags if the event is a transaction created from an interaction with the spotlight UI.
 */
export declare function isSpotlightInteraction(event: Event): boolean;
//# sourceMappingURL=spotlight.d.ts.map