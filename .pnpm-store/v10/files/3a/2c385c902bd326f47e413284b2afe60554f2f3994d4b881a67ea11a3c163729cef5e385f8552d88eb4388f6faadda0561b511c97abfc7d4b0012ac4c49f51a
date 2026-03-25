/**
 * A function to diagnose why the SDK might not be successfully sending data.
 *
 * Possible return values wrapped in a Promise:
 * - `"no-client-active"` - There was no active client when the function was called. This possibly means that the SDK was not initialized yet.
 * - `"sentry-unreachable"` - The Sentry SaaS servers were not reachable. This likely means that there is an ad blocker active on the page or that there are other connection issues.
 *
 * If the function doesn't detect an issue it resolves to `undefined`.
 */
export declare function diagnoseSdkConnectivity(): Promise<'no-client-active' | 'sentry-unreachable' | 'no-dsn-configured' | void>;
//# sourceMappingURL=diagnose-sdk.d.ts.map
