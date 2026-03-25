import { browserTracingIntegration as browserTracingIntegration$1, startBrowserTracingNavigationSpan } from '@sentry/browser';
import { instrumentVueRouter } from './router.js';

// The following type is an intersection of the Route type from VueRouter v2, v3, and v4.
// This is not great, but kinda necessary to make it work with all versions at the same time.

/**
 * A custom browser tracing integrations for Vue.
 */
function browserTracingIntegration(options = {}) {
  // If router is not passed, we just use the normal implementation
  if (!options.router) {
    return browserTracingIntegration$1(options);
  }

  const integration = browserTracingIntegration$1({
    ...options,
    instrumentNavigation: false,
  });

  const { router, instrumentNavigation = true, instrumentPageLoad = true, routeLabel = 'name' } = options;

  return {
    ...integration,
    afterAllSetup(client) {
      integration.afterAllSetup(client);

      const startNavigationSpan = (options) => {
        startBrowserTracingNavigationSpan(client, options);
      };

      instrumentVueRouter(router, { routeLabel, instrumentNavigation, instrumentPageLoad }, startNavigationSpan);
    },
  };
}

export { browserTracingIntegration };
//# sourceMappingURL=browserTracingIntegration.js.map
