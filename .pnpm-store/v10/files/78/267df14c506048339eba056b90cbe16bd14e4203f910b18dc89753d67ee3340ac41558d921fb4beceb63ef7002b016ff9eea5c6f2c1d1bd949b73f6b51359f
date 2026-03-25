import { browserTracingIntegration as originalBrowserTracingIntegration } from '@sentry/browser';
import { Integration } from '@sentry/core';
export type Route = {
    /** Unparameterized URL */
    path: string;
    /**
     * Query params (keys map to null when there is no value associated, e.g. "?foo" and to an array when there are
     * multiple query params that have the same key, e.g. "?foo&foo=bar")
     */
    query: Record<string, string | null | (string | null)[]>;
    /** Route name (VueRouter provides a way to give routes individual names) */
    name?: string | symbol | null | undefined;
    /** Evaluated parameters */
    params: Record<string, string | string[]>;
    /** All the matched route objects as defined in VueRouter constructor */
    matched: {
        path: string;
    }[];
};
interface VueRouter {
    onError: (fn: (err: Error) => void) => void;
    beforeEach: (fn: (to: Route, from: Route, next?: () => void) => void) => void;
}
type VueBrowserTracingIntegrationOptions = Parameters<typeof originalBrowserTracingIntegration>[0] & {
    /**
     * If a router is specified, navigation spans will be created based on the router.
     */
    router?: VueRouter;
    /**
     * What to use for route labels.
     * By default, we use route.name (if set) and else the path.
     *
     * Default: 'name'
     */
    routeLabel?: 'name' | 'path';
};
/**
 * A custom browser tracing integrations for Vue.
 */
export declare function browserTracingIntegration(options?: VueBrowserTracingIntegrationOptions): Integration;
export {};
//# sourceMappingURL=browserTracingIntegration.d.ts.map
