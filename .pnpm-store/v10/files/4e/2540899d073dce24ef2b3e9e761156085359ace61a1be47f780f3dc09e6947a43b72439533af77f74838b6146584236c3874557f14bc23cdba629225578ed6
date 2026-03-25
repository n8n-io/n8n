Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationMysql = require('@opentelemetry/instrumentation-mysql');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Mysql';

const instrumentMysql = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, () => new instrumentationMysql.MySQLInstrumentation({}));

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
const mysqlIntegration = core.defineIntegration(_mysqlIntegration);

exports.instrumentMysql = instrumentMysql;
exports.mysqlIntegration = mysqlIntegration;
//# sourceMappingURL=mysql.js.map
