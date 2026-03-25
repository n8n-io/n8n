import { addNonEnumerableProperty } from '../utils/object.js';
import { GLOBAL_OBJ } from '../utils/worldwide.js';

const SCOPE_ON_START_SPAN_FIELD = '_sentryScope';
const ISOLATION_SCOPE_ON_START_SPAN_FIELD = '_sentryIsolationScope';

/** Wrap a scope with a WeakRef if available, falling back to a direct scope. */
function wrapScopeWithWeakRef(scope) {
  try {
    // @ts-expect-error - WeakRef is not available in all environments
    const WeakRefClass = GLOBAL_OBJ.WeakRef;
    if (typeof WeakRefClass === 'function') {
      return new WeakRefClass(scope);
    }
  } catch {
    // WeakRef not available or failed to create
    // We'll fall back to a direct scope
  }

  return scope;
}

/** Try to unwrap a scope from a potential WeakRef wrapper. */
function unwrapScopeFromWeakRef(scopeRef) {
  if (!scopeRef) {
    return undefined;
  }

  if (typeof scopeRef === 'object' && 'deref' in scopeRef && typeof scopeRef.deref === 'function') {
    try {
      return scopeRef.deref();
    } catch {
      return undefined;
    }
  }

  // Fallback to a direct scope
  return scopeRef ;
}

/** Store the scope & isolation scope for a span, which can the be used when it is finished. */
function setCapturedScopesOnSpan(span, scope, isolationScope) {
  if (span) {
    addNonEnumerableProperty(span, ISOLATION_SCOPE_ON_START_SPAN_FIELD, wrapScopeWithWeakRef(isolationScope));
    // We don't wrap the scope with a WeakRef here because webkit aggressively garbage collects
    // and scopes are not held in memory for long periods of time.
    addNonEnumerableProperty(span, SCOPE_ON_START_SPAN_FIELD, scope);
  }
}

/**
 * Grabs the scope and isolation scope off a span that were active when the span was started.
 * If WeakRef was used and scopes have been garbage collected, returns undefined for those scopes.
 */
function getCapturedScopesOnSpan(span) {
  const spanWithScopes = span ;

  return {
    scope: spanWithScopes[SCOPE_ON_START_SPAN_FIELD],
    isolationScope: unwrapScopeFromWeakRef(spanWithScopes[ISOLATION_SCOPE_ON_START_SPAN_FIELD]),
  };
}

export { getCapturedScopesOnSpan, setCapturedScopesOnSpan };
//# sourceMappingURL=utils.js.map
