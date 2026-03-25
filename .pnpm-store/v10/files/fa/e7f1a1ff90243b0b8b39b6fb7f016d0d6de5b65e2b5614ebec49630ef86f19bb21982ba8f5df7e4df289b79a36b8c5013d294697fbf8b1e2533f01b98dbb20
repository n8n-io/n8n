Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationMysql2 = require('@opentelemetry/instrumentation-mysql2');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Mysql2';

const instrumentMysql2 = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationMysql2.MySQL2Instrumentation({
      responseHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.db.otel.mysql2');
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
const mysql2Integration = core.defineIntegration(_mysql2Integration);

exports.instrumentMysql2 = instrumentMysql2;
exports.mysql2Integration = mysql2Integration;
//# sourceMappingURL=mysql2.js.map
