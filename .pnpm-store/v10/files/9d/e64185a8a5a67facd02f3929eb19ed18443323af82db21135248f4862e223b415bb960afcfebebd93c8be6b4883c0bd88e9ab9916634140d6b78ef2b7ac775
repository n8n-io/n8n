import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';

const INTEGRATION_NAME = 'Postgres';

const instrumentPostgres = generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new PgInstrumentation({
      requireParentSpan: true,
      requestHook(span) {
        addOriginToSpan(span, 'auto.db.otel.postgres');
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
const postgresIntegration = defineIntegration(_postgresIntegration);

export { instrumentPostgres, postgresIntegration };
//# sourceMappingURL=postgres.js.map
