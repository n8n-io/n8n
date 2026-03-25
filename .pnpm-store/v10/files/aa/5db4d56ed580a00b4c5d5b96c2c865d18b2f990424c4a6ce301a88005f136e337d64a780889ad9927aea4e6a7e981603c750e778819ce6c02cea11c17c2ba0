Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationDataloader = require('@opentelemetry/instrumentation-dataloader');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Dataloader';

const instrumentDataloader = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationDataloader.DataloaderInstrumentation({
      requireParentSpan: true,
    }),
);

const _dataloaderIntegration = (() => {
  let instrumentationWrappedCallback;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const instrumentation = instrumentDataloader();
      instrumentationWrappedCallback = nodeCore.instrumentWhenWrapped(instrumentation);
    },

    setup(client) {
      // This is called either immediately or when the instrumentation is wrapped
      instrumentationWrappedCallback?.(() => {
        client.on('spanStart', span => {
          const spanJSON = core.spanToJSON(span);
          if (spanJSON.description?.startsWith('dataloader')) {
            span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.dataloader');
          }

          // These are all possible dataloader span descriptions
          // Still checking for the future versions
          // in case they add support for `clear` and `prime`
          if (
            spanJSON.description === 'dataloader.load' ||
            spanJSON.description === 'dataloader.loadMany' ||
            spanJSON.description === 'dataloader.batch'
          ) {
            span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_OP, 'cache.get');
            // TODO: We can try adding `key` to the `data` attribute upstream.
            // Or alternatively, we can add `requestHook` to the dataloader instrumentation.
          }
        });
      });
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [dataloader](https://www.npmjs.com/package/dataloader) library.
 *
 * For more information, see the [`dataloaderIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/dataloader/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.dataloaderIntegration()],
 * });
 * ```
 */
const dataloaderIntegration = core.defineIntegration(_dataloaderIntegration);

exports.dataloaderIntegration = dataloaderIntegration;
exports.instrumentDataloader = instrumentDataloader;
//# sourceMappingURL=dataloader.js.map
