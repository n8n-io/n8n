Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const browser = require('@sentry/browser');
const core = require('@sentry/core');

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

  router.onError(error => browser.captureException(error, { mechanism: { handled: false } }));

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

    core.getCurrentScope().setTransactionName(spanName);

    // Update the existing page load span with parametrized route information
    if (options.instrumentPageLoad && activePageLoadSpan) {
      const existingAttributes = core.spanToJSON(activePageLoadSpan).data;
      if (existingAttributes[core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] !== 'custom') {
        activePageLoadSpan.updateName(spanName);
        activePageLoadSpan.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, transactionSource);
      }

      // Set router attributes on the existing pageload transaction
      // This will override the origin, and add params & query attributes
      activePageLoadSpan.setAttributes({
        ...attributes,
        [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.pageload.vue',
      });

      hasHandledFirstPageLoad = true;
    }

    if (options.instrumentNavigation && !activePageLoadSpan) {
      startNavigationSpanFn({
        name: spanName,
        op: 'navigation',
        attributes: {
          ...attributes,
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.navigation.vue',
          [core.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: transactionSource,
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
  const span = core.getActiveSpan();
  const rootSpan = span && core.getRootSpan(span);

  if (!rootSpan) {
    return undefined;
  }

  const op = core.spanToJSON(rootSpan).op;

  return op === 'pageload' ? rootSpan : undefined;
}

exports.instrumentVueRouter = instrumentVueRouter;
//# sourceMappingURL=router.js.map
