Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationLruMemoizer = require('@opentelemetry/instrumentation-lru-memoizer');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'LruMemoizer';

const instrumentLruMemoizer = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, () => new instrumentationLruMemoizer.LruMemoizerInstrumentation());

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
const lruMemoizerIntegration = core.defineIntegration(_lruMemoizerIntegration);

exports.instrumentLruMemoizer = instrumentLruMemoizer;
exports.lruMemoizerIntegration = lruMemoizerIntegration;
//# sourceMappingURL=lrumemoizer.js.map
