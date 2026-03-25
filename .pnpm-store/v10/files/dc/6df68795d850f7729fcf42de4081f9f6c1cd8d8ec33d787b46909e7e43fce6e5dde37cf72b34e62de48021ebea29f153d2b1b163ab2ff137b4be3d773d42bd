import { TediousInstrumentation } from '@opentelemetry/instrumentation-tedious';
import { defineIntegration, spanToJSON, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN } from '@sentry/core';
import { generateInstrumentOnce, instrumentWhenWrapped } from '@sentry/node-core';

const TEDIUS_INSTRUMENTED_METHODS = new Set([
  'callProcedure',
  'execSql',
  'execSqlBatch',
  'execBulkLoad',
  'prepare',
  'execute',
]);

const INTEGRATION_NAME = 'Tedious';

const instrumentTedious = generateInstrumentOnce(INTEGRATION_NAME, () => new TediousInstrumentation({}));

const _tediousIntegration = (() => {
  let instrumentationWrappedCallback;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const instrumentation = instrumentTedious();
      instrumentationWrappedCallback = instrumentWhenWrapped(instrumentation);
    },

    setup(client) {
      instrumentationWrappedCallback?.(() =>
        client.on('spanStart', span => {
          const { description, data } = spanToJSON(span);
          // Tedius integration always set a span name and `db.system` attribute to `mssql`.
          if (!description || data['db.system'] !== 'mssql') {
            return;
          }

          const operation = description.split(' ')[0] || '';
          if (TEDIUS_INSTRUMENTED_METHODS.has(operation)) {
            span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.tedious');
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
const tediousIntegration = defineIntegration(_tediousIntegration);

export { instrumentTedious, tediousIntegration };
//# sourceMappingURL=tedious.js.map
