Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationTedious = require('@opentelemetry/instrumentation-tedious');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const TEDIUS_INSTRUMENTED_METHODS = new Set([
  'callProcedure',
  'execSql',
  'execSqlBatch',
  'execBulkLoad',
  'prepare',
  'execute',
]);

const INTEGRATION_NAME = 'Tedious';

const instrumentTedious = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, () => new instrumentationTedious.TediousInstrumentation({}));

const _tediousIntegration = (() => {
  let instrumentationWrappedCallback;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const instrumentation = instrumentTedious();
      instrumentationWrappedCallback = nodeCore.instrumentWhenWrapped(instrumentation);
    },

    setup(client) {
      instrumentationWrappedCallback?.(() =>
        client.on('spanStart', span => {
          const { description, data } = core.spanToJSON(span);
          // Tedius integration always set a span name and `db.system` attribute to `mssql`.
          if (!description || data['db.system'] !== 'mssql') {
            return;
          }

          const operation = description.split(' ')[0] || '';
          if (TEDIUS_INSTRUMENTED_METHODS.has(operation)) {
            span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.tedious');
          }
        }),
      );
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [tedious](https://www.npmjs.com/package/tedious) library.
 *
 * For more information, see the [`tediousIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/tedious/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.tediousIntegration()],
 * });
 * ```
 */
const tediousIntegration = core.defineIntegration(_tediousIntegration);

exports.instrumentTedious = instrumentTedious;
exports.tediousIntegration = tediousIntegration;
//# sourceMappingURL=tedious.js.map
