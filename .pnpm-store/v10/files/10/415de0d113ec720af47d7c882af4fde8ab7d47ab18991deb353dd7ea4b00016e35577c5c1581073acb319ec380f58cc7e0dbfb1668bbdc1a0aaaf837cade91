# 3.2.1 - 2023-12-15

1. Fixes issue where a background refresh of feature flags could throw an unhandled error. It now emits to be detected by `.on('error', ...)`

# 3.2.0 - 2023-12-05

1. Fixes issues with Axios imports for non-node environments like Cloudflare workers
2. Uses the globally defined `fetch` if available, otherwise imports and uses axios as a polyfill

# 3.1.3 - 2023-10-27

1. Updates axios dependency

# 3.1.2 - 2023-08-17

1. Returns the current flag property with $feature_flag_called events, to make it easier to use in experiments

# 3.1.1 - 2023-04-26

1. Replace crypto library with pure-js rusha library which makes posthog-node work with Cloudflare Workers in Next.js edge runtime.

# 3.1.0 - 2023-04-19

1. Some small fixes to incorrect types
2. Fixed fetch compatibility by aligning error handling
3. Added two errors: PostHogFetchHttpError (non-2xx status) and PostHogFetchNetworkError (fetch network error)
4. Added .on('error', (err) => void)
5. shutdownAsync now ignores fetch errors. They should be handled with .on('error', ...) from now on.

# 3.0.0 - 2023-04-14

Breaking change:

All events by default now send the `$geoip_disable` property to disable geoip lookup in app. This is because usually we don't
want to update person properties to take the server's location.

The same now happens for feature flag requests, where we discard the IP address of the server for matching on geoip properties like city, country, continent.

To restore previous behaviour, you can set the default to False like so:

```javascript
const posthog = new PostHog(PH_API_KEY, {
  host: PH_HOST,
  disableGeoip: false,
})
```

# 2.6.0 - 2023-03-14

1. Add support for all cohorts local evaluation in feature flags.

# 2.5.4 - 2023-02-27

1. Fix error log for local evaluation of feature flags (InconclusiveMatchError(s)) to only show during debug mode.

# 2.5.3 - 2023-02-21

1. Allow passing in a distinctId to `groupIdentify()`.
2. Fix a bug with active feature flags on capture events, where non-active flags would be added to the list as well.

# 2.5.2 - 2023-02-17

1. Fix issue where properties passed to `.identify` were not set correctly

# 2.5.1 - 2023-02-16

1. Make sure shutdown waits for pending promises to resolve. Fixes a problem with using PostHog Node in serverless environments.

# 2.5.0 - 2023-02-15

1. Removes shared client from `posthog-node`, getting rid of some race condition bugs when capturing events.
2. Sets minimum version of node.js to 15

# 2.4.0 - 2023-02-02

1. Adds support for overriding timestamp of capture events

# 2.3.0 - 2023-1-26

1. uses v3 decide endpoint
2. JSON payloads will be returned with feature flags
3. Feature flags will gracefully fail and optimistically save evaluated flags if server is down

# 2.2.3 - 2022-12-01

1. Fix issues with timeouts for local evaluation requests

# 2.2.2 - 2022-11-28

1. Fix issues with timeout

# 2.2.1 - 2022-11-24

1. Add standard 10 second timeout

# 2.2.0 - 2022-11-18

1. Add support for variant overrides for feature flag local evaluation.
2. Add support for date operators in feature flag local evaluation.

# 2.1.0 - 2022-09-08

1. Swaps `unidici` for `axios` in order to support older versions of Node
2. The `fetch` implementation can be overridden as an option for those who wish to use an alternative implementation
3. Fixes the minimum Node version to >=14.17.0

# 2.0.2 - 2022-08-23

1. Removes references to `cli.js`
2. Removes default `PostHogGlobal` export, and unifies import signature for `typescript`, `commonjs` and `esm` builds.

# 2.0.1 - 2022-08-15

Breaking changes:

1. Feature flag defaults are no more. When we fail to compute any flag, we return `undefined`. All computed flags return either `true`, `false` or `String`.
2. Minimum PostHog version requirement is 1.38
3. Default polling interval for feature flags is now set at 30 seconds. If you don't want local evaluation, don't set a personal API key in the library.
4. The `callback` parameter passed as an optional last argument to most of the methods is no longer supported
5. The CLI is no longer supported

What's new:

1. You can now evaluate feature flags locally (i.e. without sending a request to your PostHog servers) by setting a personal API key, and passing in groups and person properties to `isFeatureEnabled` and `getFeatureFlag` calls.
2. Introduces a `getAllFlags` method that returns all feature flags. This is useful for when you want to seed your frontend with some initial flags, given a user ID.
