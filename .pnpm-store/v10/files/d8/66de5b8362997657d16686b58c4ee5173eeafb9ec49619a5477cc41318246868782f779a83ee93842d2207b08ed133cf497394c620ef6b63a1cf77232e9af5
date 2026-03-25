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
const browserSessionIntegration = core.defineIntegration(() => {
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

      // We want to create a session for every navigation as well
      browserUtils.addHistoryInstrumentationHandler(({ from, to }) => {
        // Don't create an additional session for the initial route or if the location did not change
        if (from !== undefined && from !== to) {
          core.startSession({ ignoreDuration: true });
          core.captureSession();
        }
      });
    },
  };
});

exports.browserSessionIntegration = browserSessionIntegration;
//# sourceMappingURL=browsersession.js.map
