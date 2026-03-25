<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Official Sentry SDK for Browsers

[![Sauce Test Status](https://saucelabs.com/buildstatus/sentryio)](https://saucelabs.com/u/sentryio)
[![npm version](https://img.shields.io/npm/v/@sentry/browser.svg)](https://www.npmjs.com/package/@sentry/browser)
[![npm dm](https://img.shields.io/npm/dm/@sentry/browser.svg)](https://www.npmjs.com/package/@sentry/browser)
[![npm dt](https://img.shields.io/npm/dt/@sentry/browser.svg)](https://www.npmjs.com/package/@sentry/browser)

## Links

- [Official SDK Docs](https://docs.sentry.io/quickstart/)

## Usage

To use this SDK, call `Sentry.init(options)` as early as possible after loading the page. This will initialize the SDK
and hook into the environment. Note that you can turn off almost all side effects using the respective options.

```javascript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: '__DSN__',
  // ...
});
```

To set context information or send manual events, use the exported functions of `@sentry/browser`. Note that these
functions will not perform any action before you have called `Sentry.init()`:

```javascript
import * as Sentry from '@sentry/browser';

// Set user information, as well as tags and further extras
Sentry.setExtra('battery', 0.7);
Sentry.setTag('user_mode', 'admin');
Sentry.setUser({ id: '4711' });

// Add a breadcrumb for future events
Sentry.addBreadcrumb({
  message: 'My Breadcrumb',
  // ...
});

// Capture exceptions, messages or manual events
Sentry.captureMessage('Hello, world!');
Sentry.captureException(new Error('Good bye'));
Sentry.captureEvent({
  message: 'Manual',
  stacktrace: [
    // ...
  ],
});
```
