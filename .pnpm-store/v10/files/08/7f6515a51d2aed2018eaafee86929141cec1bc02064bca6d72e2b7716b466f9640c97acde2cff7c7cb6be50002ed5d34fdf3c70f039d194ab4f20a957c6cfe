import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce } from '@sentry/node-core';

const INTEGRATION_NAME = 'Mysql';

const instrumentMysql = generateInstrumentOnce(INTEGRATION_NAME, () => new MySQLInstrumentation({}));

const _mysqlIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentMysql();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [mysql](https://www.npmjs.com/package/mysql) library.
 *
 * For more information, see the [`mysqlIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/mysql/).
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
const mysqlIntegration = defineIntegration(_mysqlIntegration);

export { instrumentMysql, mysqlIntegration };
//# sourceMappingURL=mysql.js.map
