import { captureException } from '@sentry/browser';
import { getCurrentScope, spanToJSON, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, getActiveSpan, getRootSpan } from '@sentry/core';

// The following type is an intersection of the Route type from VueRouter v2, v3, and v4.
// This is not great, but kinda necessary to make it work with all versions at the same time.

/**
 * Instrument the Vue router to create navigation spans.
 */
function instrumentVueRouter(
  router,
  options

,
  startNavigationSpanFn,
) {
  let hasHandledFirstPageLoad = false;

  router.onError(error => captureException(error, { mechanism: { handled: false } }));

  router.beforeEach((to, _from, next) => {
    // We avoid trying to re-fetch the page load span when we know we already handled it the first time
    const activePageLoadSpan = !hasHandledFirstPageLoad ? getActivePageLoadSpan() : undefined;

    const attributes = {};

    for (const key of Object.keys(to.params)) {
      attributes[`url.path.parameter.${key}`] = to.params[key];
      attributes[`params.${key}`] = to.params[key]; // params.[key] is an alias
    }
    for (const key of Object.keys(to.query)) {
      const value = to.query[key];
      if (value) {
        attributes[`query.${key}`] = value;
      }
    }

    // Determine a name for the routing transaction and where that name came from
    let spanName = to.path;
    let transactionSource = 'url';
    if (to.name && options.routeLabel !== 'path') {
      spanName = to.name.toString();
      transactionSource = 'custom';
    } else if (to.matched.length > 0) {
      const lastIndex = to.matched.length - 1;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      spanName = to.matched[lastIndex].path;
      transactionSource = 'route';
    }

    getCurrentScope().setTransactionName(spanName);

    // Update the existing page load span with parametrized route information
    if (options.instrumentPageLoad && activePageLoadSpan) {
      const existingAttributes = spanToJSON(activePageLoadSpan).data;
      if (existingAttributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] !== 'custom') {
        activePageLoadSpan.updateName(spanName);
        activePageLoadSpan.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, transactionSource);
      }

      // Set router attributes on the existing pageload transaction
      // This will override the origin, and add params & query attributes
      activePageLoadSpan.setAttributes({
        ...attributes,
        [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.pageload.vue',
      });

      hasHandledFirstPageLoad = true;
    }

    if (options.instrumentNavigation && !activePageLoadSpan) {
      startNavigationSpanFn({
        name: spanName,
        op: 'navigation',
        attributes: {
          ...attributes,
          [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.vue',
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: transactionSource,
        },
      });
    }

    // Vue Router 4 no longer exposes the `next` function, so we need to
    // check if it's available before calling it.
    // `next` needs to be called in Vue Router 3 so that the hook is resolved.
    if (next) {
      next();
    }
  });
}

function getActivePageLoadSpan() {
  const span = getActiveSpan();
  const rootSpan = span && getRootSpan(span);

  if (!rootSpan) {
    return undefined;
  }

  const op = spanToJSON(rootSpan).op;

  return op === 'pageload' ? rootSpan : undefined;
}

export { instrumentVueRouter };
//# sourceMappingURL=router.js.map
