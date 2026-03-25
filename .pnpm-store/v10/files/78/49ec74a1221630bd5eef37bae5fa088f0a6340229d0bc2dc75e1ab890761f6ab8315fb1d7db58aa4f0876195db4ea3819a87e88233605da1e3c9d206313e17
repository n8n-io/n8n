import { getActiveSpan, getCurrentScope, _INTERNAL_setSpanForScope } from '@sentry/core';

/**
 * Sets an inactive span active on the current scope.
 *
 * This is useful in browser applications, if you want to create a span that cannot be finished
 * within its callback. Any spans started while the given span is active, will be children of the span.
 *
 * If there already was an active span on the scope prior to calling this function, it is replaced
 * with the given span and restored after the span ended. Otherwise, the span will simply be
 * removed, resulting in no active span on the scope.
 *
 * IMPORTANT: This function can ONLY be used in the browser! Calling this function in a server
 * environment (for example in a server-side rendered component) will result in undefined behaviour
 * and is not supported.
 * You MUST call `span.end()` manually, otherwise the span will never be finished.
 *
 * @example
 * ```js
 * let checkoutSpan;
 *
 * on('checkoutStarted', () => {
 *  checkoutSpan = Sentry.startInactiveSpan({ name: 'checkout-flow' });
 *  Sentry.setActiveSpanInBrowser(checkoutSpan);
 * })
 *
 * // during this time, any spans started will be children of `checkoutSpan`:
 * Sentry.startSpan({ name: 'checkout-step-1' }, () => {
 *  // ... `
 * })
 *
 * on('checkoutCompleted', () => {
 *  checkoutSpan?.end();
 * })
 * ```
 *
 * @param span - the span to set active
 */
function setActiveSpanInBrowser(span) {
  const maybePreviousActiveSpan = getActiveSpan();

  // If the span is already active, there's no need to double-patch or set it again.
  // This also guards against users (for whatever reason) calling setActiveSpanInBrowser on SDK-started
  // idle spans like pageload or navigation spans. These will already be handled correctly by the SDK.
  // For nested situations, we have to double-patch to ensure we restore the correct previous span (see tests)
  if (maybePreviousActiveSpan === span) {
    return;
  }

  const scope = getCurrentScope();

  // Putting a small patch onto the span.end method to ensure we
  // remove the span from the scope when it ends.
  // eslint-disable-next-line @typescript-eslint/unbound-method
  span.end = new Proxy(span.end, {
    apply(target, thisArg, args) {
      _INTERNAL_setSpanForScope(scope, maybePreviousActiveSpan);
      return Reflect.apply(target, thisArg, args);
    },
  });

  _INTERNAL_setSpanForScope(scope, span);
}

export { setActiveSpanInBrowser };
//# sourceMappingURL=setActiveSpan.js.map
