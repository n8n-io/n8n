import { LruMemoizerInstrumentation } from '@opentelemetry/instrumentation-lru-memoizer';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce } from '@sentry/node-core';

const INTEGRATION_NAME = 'LruMemoizer';

const instrumentLruMemoizer = generateInstrumentOnce(INTEGRATION_NAME, () => new LruMemoizerInstrumentation());

const _lruMemoizerIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentLruMemoizer();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [lru-memoizer](https://www.npmjs.com/package/lru-memoizer) library.
 *
 * For more information, see the [`lruMemoizerIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/lrumemoizer/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.lruMemoizerIntegration()],
 * });
 */
const lruMemoizerIntegration = defineIntegration(_lruMemoizerIntegration);

export { instrumentLruMemoizer, lruMemoizerIntegration };
//# sourceMappingURL=lrumemoizer.js.map
