Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationPg = require('@opentelemetry/instrumentation-pg');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Postgres';

const instrumentPostgres = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationPg.PgInstrumentation({
      requireParentSpan: true,
      requestHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.db.otel.postgres');
      },
    }),
);

const _postgresIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentPostgres();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [pg](https://www.npmjs.com/package/pg) library.
 *
 * For more information, see the [`postgresIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/postgres/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.postgresIntegration()],
 * });
 * ```
 */
const postgresIntegration = core.defineIntegration(_postgresIntegration);

exports.instrumentPostgres = instrumentPostgres;
exports.postgresIntegration = postgresIntegration;
//# sourceMappingURL=postgres.js.map
