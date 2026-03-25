import { getAsyncContextStrategy } from './asyncContext/index.js';
import { getMainCarrier, getGlobalSingleton } from './carrier.js';
import { Scope } from './scope.js';
import { generateSpanId } from './utils/propagationContext.js';

/**
 * Get the currently active scope.
 */
function getCurrentScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getCurrentScope();
}

/**
 * Get the currently active isolation scope.
 * The isolation scope is active for the current execution context.
 */
function getIsolationScope() {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);
  return acs.getIsolationScope();
}

/**
 * Get the global scope.
 * This scope is applied to _all_ events.
 */
function getGlobalScope() {
  return getGlobalSingleton('globalScope', () => new Scope());
}

/**
 * Creates a new scope with and executes the given operation within.
 * The scope is automatically removed once the operation
 * finishes or throws.
 */

/**
 * Either creates a new active scope, or sets the given scope as active scope in the given callback.
 */
function withScope(
  ...rest
) {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);

  // If a scope is defined, we want to make this the active scope instead of the default one
  if (rest.length === 2) {
    const [scope, callback] = rest;

    if (!scope) {
      return acs.withScope(callback);
    }

    return acs.withSetScope(scope, callback);
  }

  return acs.withScope(rest[0]);
}

/**
 * Attempts to fork the current isolation scope and the current scope based on the current async context strategy. If no
 * async context strategy is set, the isolation scope and the current scope will not be forked (this is currently the
 * case, for example, in the browser).
 *
 * Usage of this function in environments without async context strategy is discouraged and may lead to unexpected behaviour.
 *
 * This function is intended for Sentry SDK and SDK integration development. It is not recommended to be used in "normal"
 * applications directly because it comes with pitfalls. Use at your own risk!
 */

/**
 * Either creates a new active isolation scope, or sets the given isolation scope as active scope in the given callback.
 */
function withIsolationScope(
  ...rest

) {
  const carrier = getMainCarrier();
  const acs = getAsyncContextStrategy(carrier);

  // If a scope is defined, we want to make this the active scope instead of the default one
  if (rest.length === 2) {
    const [isolationScope, callback] = rest;

    if (!isolationScope) {
      return acs.withIsolationScope(callback);
    }

    return acs.withSetIsolationScope(isolationScope, callback);
  }

  return acs.withIsolationScope(rest[0]);
}

/**
 * Get the currently active client.
 */
function getClient() {
  return getCurrentScope().getClient();
}

/**
 * Get a trace context for the given scope.
 */
function getTraceContextFromScope(scope) {
  const propagationContext = scope.getPropagationContext();

  const { traceId, parentSpanId, propagationSpanId } = propagationContext;

  const traceContext = {
    trace_id: traceId,
    span_id: propagationSpanId || generateSpanId(),
  };

  if (parentSpanId) {
    traceContext.parent_span_id = parentSpanId;
  }

  return traceContext;
}

export { getClient, getCurrentScope, getGlobalScope, getIsolationScope, getTraceContextFromScope, withIsolationScope, withScope };
//# sourceMappingURL=currentScopes.js.map
