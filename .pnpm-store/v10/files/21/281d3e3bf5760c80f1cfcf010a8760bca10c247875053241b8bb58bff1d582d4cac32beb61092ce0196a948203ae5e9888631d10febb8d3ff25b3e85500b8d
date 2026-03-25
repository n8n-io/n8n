<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Sentry Session Replay with Canvas

## Pre-requisites

Replay with canvas requires Node 14+, and browsers newer than IE11.

## Installation

Replay and ReplayCanvas can be imported from `@sentry/browser`, or a respective SDK package like `@sentry/react` or
`@sentry/vue`. You don't need to install anything in order to use Session Replay. The minimum version that includes
Replay is 7.27.0.

For details on using Replay when using Sentry via the CDN bundles, see [CDN bundle](#loading-replay-as-a-cdn-bundle).

## Setup

To set up the canvas integration, add the following to your Sentry integrations:

```javascript
Sentry.replayCanvasIntegration(),
```

### Full Example

```javascript
import * as Sentry from '@sentry/browser';
// or e.g. import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: '__DSN__',

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration(), Sentry.replayCanvasIntegration()],
  // ...
});
```
