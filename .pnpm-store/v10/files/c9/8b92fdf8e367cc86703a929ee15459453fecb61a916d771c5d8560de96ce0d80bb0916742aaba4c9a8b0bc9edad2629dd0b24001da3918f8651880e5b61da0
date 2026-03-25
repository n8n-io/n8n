Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationGenericPool = require('@opentelemetry/instrumentation-generic-pool');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'GenericPool';

const instrumentGenericPool = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, () => new instrumentationGenericPool.GenericPoolInstrumentation({}));

const _genericPoolIntegration = (() => {
  let instrumentationWrappedCallback;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const instrumentation = instrumentGenericPool();
      instrumentationWrappedCallback = nodeCore.instrumentWhenWrapped(instrumentation);
    },

    setup(client) {
      instrumentationWrappedCallback?.(() =>
        client.on('spanStart', span => {
          const spanJSON = core.spanToJSON(span);

          const spanDescription = spanJSON.description;

          // typo in emitted span for version <= 0.38.0 of @opentelemetry/instrumentation-generic-pool
          const isGenericPoolSpan =
            spanDescription === 'generic-pool.aquire' || spanDescription === 'generic-pool.acquire';

          if (isGenericPoolSpan) {
            span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.generic_pool');
          }
        }),
      );
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [generic-pool](https://www.npmjs.com/package/generic-pool) library.
 *
 * For more information, see the [`genericPoolIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/genericpool/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.genericPoolIntegration()],
 * });
 * ```
 */
const genericPoolIntegration = core.defineIntegration(_genericPoolIntegration);

exports.genericPoolIntegration = genericPoolIntegration;
exports.instrumentGenericPool = instrumentGenericPool;
//# sourceMappingURL=genericPool.js.map
