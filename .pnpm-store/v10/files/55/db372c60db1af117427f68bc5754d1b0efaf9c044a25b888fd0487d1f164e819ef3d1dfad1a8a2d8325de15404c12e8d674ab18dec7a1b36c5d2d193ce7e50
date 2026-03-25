import { getClient, suppressTracing } from '@sentry/core';

/**
 * A function to diagnose why the SDK might not be successfully sending data.
 *
 * Possible return values wrapped in a Promise:
 * - `"no-client-active"` - There was no active client when the function was called. This possibly means that the SDK was not initialized yet.
 * - `"sentry-unreachable"` - The Sentry SaaS servers were not reachable. This likely means that there is an ad blocker active on the page or that there are other connection issues.
 *
 * If the function doesn't detect an issue it resolves to `undefined`.
 */
async function diagnoseSdkConnectivity()

 {
  const client = getClient();

  if (!client) {
    return 'no-client-active';
  }

  if (!client.getDsn()) {
    return 'no-dsn-configured';
  }

  // Check if a tunnel is configured and use it if available
  const tunnel = client.getOptions().tunnel;

  // We are using the
  // - "sentry-sdks" org with id 447951 not to pollute any actual organizations.
  // - "diagnose-sdk-connectivity" project with id 4509632503087104
  // - the public key of said org/project, which is disabled in the project settings
  // => this DSN: https://c1dfb07d783ad5325c245c1fd3725390@o447951.ingest.us.sentry.io/4509632503087104 (i.e. disabled)
  const defaultUrl =
    'https://o447951.ingest.sentry.io/api/4509632503087104/envelope/?sentry_version=7&sentry_key=c1dfb07d783ad5325c245c1fd3725390&sentry_client=sentry.javascript.browser%2F1.33.7';

  const url = tunnel || defaultUrl;

  try {
    await suppressTracing(() =>
      // If fetch throws, there is likely an ad blocker active or there are other connective issues.
      fetch(url, {
        body: '{}',
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
      }),
    );
  } catch {
    return 'sentry-unreachable';
  }
}

export { diagnoseSdkConnectivity };
//# sourceMappingURL=diagnose-sdk.js.map
