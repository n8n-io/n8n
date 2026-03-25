import type { StartSpanOptions } from '@sentry/core';
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
/**
 * Instrument the Vue router to create navigation spans.
 */
export declare function instrumentVueRouter(router: VueRouter, options: {
    /**
     * What to use for route labels.
     * By default, we use route.name (if set) and else the path.
     *
     * Default: 'name'
     */
    routeLabel: 'name' | 'path';
    instrumentPageLoad: boolean;
    instrumentNavigation: boolean;
}, startNavigationSpanFn: (context: StartSpanOptions) => void): void;
export {};
//# sourceMappingURL=router.d.ts.map