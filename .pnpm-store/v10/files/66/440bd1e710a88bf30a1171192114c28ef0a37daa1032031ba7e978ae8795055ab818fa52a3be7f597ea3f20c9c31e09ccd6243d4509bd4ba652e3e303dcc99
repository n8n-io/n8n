Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');

/**
 * A custom browser tracing integration for TanStack Router.
 *
 * The minimum compatible version of `@tanstack/vue-router` is `1.64.0`.
 *
 * @param router A TanStack Router `Router` instance that should be used for routing instrumentation.
 * @param options Sentry browser tracing configuration.
 */
function tanstackRouterBrowserTracingIntegration(
  router,
  options = {},
) {
  const browserTracingIntegrationInstance = browser.browserTracingIntegration({
    ...options,
    instrumentNavigation: false,
    instrumentPageLoad: false,
  });

  const { instrumentPageLoad = true, instrumentNavigation = true } = options;

  return {
    ...browserTracingIntegrationInstance,
    afterAllSetup(client) {
      browserTracingIntegrationInstance.afterAllSetup(client);

      const initialWindowLocation = browser.WINDOW.location;
      if (instrumentPageLoad && initialWindowLocation) {
        const matchedRoutes = router.matchRoutes(
          initialWindowLocation.pathname,
          router.options.parseSearch(initialWindowLocation.search),
          { preload: false, throwOnError: false },
        );

        const lastMatch = matchedRoutes[matchedRoutes.length - 1];
        // If we only match __root__, we ended up not matching any route at all, so
        // we fall back to the pathname.
        const routeMatch = lastMatch?.routeId !== '__root__' ? lastMatch : undefined;

        browser.startBrowserTracingPageLoadSpan(client, {
          name: routeMatch ? routeMatch.routeId : initialWindowLocation.pathname,
          attributes: {
            [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'pageload',
            [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.pageload.vue.tanstack_router',
            [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: routeMatch ? 'route' : 'url',
            ...routeMatchToParamSpanAttributes(routeMatch),
          },
        });
      }

      if (instrumentNavigation) {
        // The onBeforeNavigate hook is called at the very beginning of a navigation and is only called once per navigation, even when the user is redirected
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.subscribe('onBeforeNavigate', (onBeforeNavigateArgs) => {
          // onBeforeNavigate is called during pageloads. We can avoid creating navigation spans by:
          // 1. Checking if there's no fromLocation (initial pageload)
          // 2. Comparing the states of the to and from arguments

          if (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            !onBeforeNavigateArgs.fromLocation ||
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            onBeforeNavigateArgs.toLocation.state === onBeforeNavigateArgs.fromLocation.state
          ) {
            return;
          }

          const onResolvedMatchedRoutes = router.matchRoutes(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            onBeforeNavigateArgs.toLocation.pathname,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            onBeforeNavigateArgs.toLocation.search,
            { preload: false, throwOnError: false },
          );

          const onBeforeNavigateLastMatch = onResolvedMatchedRoutes[onResolvedMatchedRoutes.length - 1];
          const onBeforeNavigateRouteMatch =
            onBeforeNavigateLastMatch?.routeId !== '__root__' ? onBeforeNavigateLastMatch : undefined;

          const navigationLocation = browser.WINDOW.location;
          const navigationSpan = browser.startBrowserTracingNavigationSpan(client, {
            name: onBeforeNavigateRouteMatch
              ? onBeforeNavigateRouteMatch.routeId
              : // In SSR/non-browser contexts, WINDOW.location may be undefined, so fall back to the router's location
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                navigationLocation?.pathname || onBeforeNavigateArgs.toLocation.pathname,
            attributes: {
              [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: 'navigation',
              [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.vue.tanstack_router',
              [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: onBeforeNavigateRouteMatch ? 'route' : 'url',
            },
          });

          // In case the user is redirected during navigation we want to update the span with the right value.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const unsubscribeOnResolved = router.subscribe('onResolved', (onResolvedArgs) => {
            unsubscribeOnResolved();
            if (navigationSpan) {
              const onResolvedMatchedRoutes = router.matchRoutes(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                onResolvedArgs.toLocation.pathname,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                onResolvedArgs.toLocation.search,
                { preload: false, throwOnError: false },
              );

              const onResolvedLastMatch = onResolvedMatchedRoutes[onResolvedMatchedRoutes.length - 1];
              const onResolvedRouteMatch =
                onResolvedLastMatch?.routeId !== '__root__' ? onResolvedLastMatch : undefined;

              if (onResolvedRouteMatch) {
                navigationSpan.updateName(onResolvedRouteMatch.routeId);
                navigationSpan.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, 'route');
                navigationSpan.setAttributes(routeMatchToParamSpanAttributes(onResolvedRouteMatch));
              }
            }
          });
        });
      }
    },
  };
}

function routeMatchToParamSpanAttributes(match) {
  if (!match) {
    return {};
  }

  const paramAttributes = {};
  Object.entries(match.params ).forEach(([key, value]) => {
    paramAttributes[`url.path.parameter.${key}`] = value;
    paramAttributes[`params.${key}`] = value; // params.[key] is an alias
  });

  return paramAttributes;
}

exports.tanstackRouterBrowserTracingIntegration = tanstackRouterBrowserTracingIntegration;
//# sourceMappingURL=tanstackrouter.js.map
