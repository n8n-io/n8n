import { MySQL2Instrumentation } from '@opentelemetry/instrumentation-mysql2';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';

const INTEGRATION_NAME = 'Mysql2';

const instrumentMysql2 = generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new MySQL2Instrumentation({
      responseHook(span) {
        addOriginToSpan(span, 'auto.db.otel.mysql2');
      },
    }),
);

const _mysql2Integration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentMysql2();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [mysql2](https://www.npmjs.com/package/mysql2) library.
 *
 * For more information, see the [`mysql2Integration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/mysql2/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.mysqlIntegration()],
 * });
 * ```
 */
const mysql2Integration = defineIntegration(_mysql2Integration);

export { instrumentMysql2, mysql2Integration };
//# sourceMappingURL=mysql2.js.map
