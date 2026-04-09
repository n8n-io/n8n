Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');

/**
 * When added, automatically creates sessions which allow you to track adoption and crashes (crash free rate) in your Releases in Sentry.
 * More information: https://docs.sentry.io/product/releases/health/
 *
 * Note: In order for session tracking to work, you need to set up Releases: https://docs.sentry.io/product/releases/
 */
const browserSessionIntegration = core.defineIntegration((options = {}) => {
  const lifecycle = options.lifecycle ?? 'route';

  return {
    name: 'BrowserSession',
    setupOnce() {
      if (typeof helpers.WINDOW.document === 'undefined') {
        debugBuild.DEBUG_BUILD &&
          core.debug.warn('Using the `browserSessionIntegration` in non-browser environments is not supported.');
        return;
      }

      // The session duration for browser sessions does not track a meaningful
      // concept that can be used as a metric.
      // Automatically captured sessions are akin to page views, and thus we
      // discard their duration.
      core.startSession({ ignoreDuration: true });
      core.captureSession();

      // User data can be set at any time, for example async after Sentry.init has run and the initial session
      // envelope was already sent, but still on the initial page.
      // Therefore, we have to update the ongoing session with the new user data if it exists, to send the `did`.
      // In theory, sessions, as well as user data is always put onto the isolation scope. So we listen to the
      // isolation scope for changes and update the session with the new user data if it exists.
      // This will not catch users set onto other scopes, like the current scope. For now, we'll accept this limitation.
      // The alternative is to update and capture the session from within the scope. This could be too costly or would not
      // play well with session aggregates on the server side. Since this happens in the scope class, we'd need change
      // scope behaviour in the browser.
      const isolationScope = core.getIsolationScope();
      let previousUser = isolationScope.getUser();
      isolationScope.addScopeListener(scope => {
        const maybeNewUser = scope.getUser();
        // sessions only care about user id and ip address, so we only need to capture the session if the user has changed
        if (previousUser?.id !== maybeNewUser?.id || previousUser?.ip_address !== maybeNewUser?.ip_address) {
          // the scope class already writes the user to its session, so we only need to capture the session here
          core.captureSession();
          previousUser = maybeNewUser;
        }
      });

      if (lifecycle === 'route') {
        // We want to create a session for every navigation as well
        browserUtils.addHistoryInstrumentationHandler(({ from, to }) => {
          // Don't create an additional session for the initial route or if the location did not change
          if (from !== to) {
            core.startSession({ ignoreDuration: true });
            core.captureSession();
          }
        });
      }
    },
  };
});

exports.browserSessionIntegration = browserSessionIntegration;
//# sourceMappingURL=browsersession.js.map
