import { context } from '@opentelemetry/api';
import { getScopesFromContext } from '@sentry/opentelemetry';

/**
 * Update the active isolation scope.
 * Should be used with caution!
 */
function setIsolationScope(isolationScope) {
  const scopes = getScopesFromContext(context.active());
  if (scopes) {
    scopes.isolationScope = isolationScope;
  }
}

export { setIsolationScope };
//# sourceMappingURL=scope.js.map
