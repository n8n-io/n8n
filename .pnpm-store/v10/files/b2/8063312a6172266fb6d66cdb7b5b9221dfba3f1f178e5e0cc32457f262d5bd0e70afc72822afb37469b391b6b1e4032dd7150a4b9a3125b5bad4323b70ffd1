Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const router = require('./router.js');

// The following type is an intersection of the Route type from VueRouter v2, v3, and v4.
// This is not great, but kinda necessary to make it work with all versions at the same time.

/**
 * A custom browser tracing integrations for Vue.
 */
function browserTracingIntegration(options = {}) {
  // If router is not passed, we just use the normal implementation
  if (!options.router) {
    return browser.browserTracingIntegration(options);
  }

  const integration = browser.browserTracingIntegration({
    ...options,
    instrumentNavigation: false,
  });

  const { router: router$1, instrumentNavigation = true, instrumentPageLoad = true, routeLabel = 'name' } = options;

  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);

      const startNavigationSpan = (options) => {
        browser.startBrowserTracingNavigationSpan(client, options);
      };

      router.instrumentVueRouter(router$1, { routeLabel, instrumentNavigation, instrumentPageLoad }, startNavigationSpan);
    },
  };
}

exports.browserTracingIntegration = browserTracingIntegration;
//# sourceMappingURL=browserTracingIntegration.js.map
