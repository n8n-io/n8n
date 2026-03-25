import { isWrapped } from '@opentelemetry/instrumentation';
import { getClient, isEnabled, hasSpansEnabled, consoleSandbox, getGlobalScope } from '@sentry/core';
import { createMissingInstrumentationContext } from './createMissingInstrumentationContext.js';
import { isCjs } from './detection.js';

/**
 * Checks and warns if a framework isn't wrapped by opentelemetry.
 */
function ensureIsWrapped(
  maybeWrappedFunction,
  name,
) {
  const clientOptions = getClient()?.getOptions();
  if (
    !clientOptions?.disableInstrumentationWarnings &&
    !isWrapped(maybeWrappedFunction) &&
    isEnabled() &&
    hasSpansEnabled(clientOptions)
  ) {
    consoleSandbox(() => {
      if (isCjs()) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Sentry] ${name} is not instrumented. This is likely because you required/imported ${name} before calling \`Sentry.init()\`.`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `[Sentry] ${name} is not instrumented. Please make sure to initialize Sentry in a separate file that you \`--import\` when running node, see: https://docs.sentry.io/platforms/javascript/guides/${name}/install/esm/.`,
        );
      }
    });

    getGlobalScope().setContext('missing_instrumentation', createMissingInstrumentationContext(name));
  }
}

export { ensureIsWrapped };
//# sourceMappingURL=ensureIsWrapped.js.map
