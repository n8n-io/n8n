interface BrowserSessionOptions {
    /**
     * Controls the session lifecycle - when new sessions are created.
     *
     * - `'route'`: A session is created on page load and on every navigation.
     *   This is the default behavior.
     * - `'page'`: A session is created once when the page is loaded. Session is not
     *   updated on navigation. This is useful for webviews or single-page apps where
     *   URL changes should not trigger new sessions.
     *
     * @default 'route'
     */
    lifecycle?: 'route' | 'page';
}
/**
 * When added, automatically creates sessions which allow you to track adoption and crashes (crash free rate) in your Releases in Sentry.
 * More information: https://docs.sentry.io/product/releases/health/
 *
 * Note: In order for session tracking to work, you need to set up Releases: https://docs.sentry.io/product/releases/
 */
export declare const browserSessionIntegration: (options?: BrowserSessionOptions | undefined) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=browsersession.d.ts.map