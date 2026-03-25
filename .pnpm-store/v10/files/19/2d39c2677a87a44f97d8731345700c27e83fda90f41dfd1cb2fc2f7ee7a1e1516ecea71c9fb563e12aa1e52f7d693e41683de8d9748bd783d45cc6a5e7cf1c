Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationMongodb = require('@opentelemetry/instrumentation-mongodb');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Mongo';

const instrumentMongo = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationMongodb.MongoDBInstrumentation({
      dbStatementSerializer: _defaultDbStatementSerializer,
      responseHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.db.otel.mongo');
      },
    }),
);

/**
 * Replaces values in document with '?', hiding PII and helping grouping.
 */
function _defaultDbStatementSerializer(commandObj) {
  const resultObj = _scrubStatement(commandObj);
  return JSON.stringify(resultObj);
}

function _scrubStatement(value) {
  if (Array.isArray(value)) {
    return value.map(element => _scrubStatement(element));
  }

  if (isCommandObj(value)) {
    const initial = {};
    return Object.entries(value)
      .map(([key, element]) => [key, _scrubStatement(element)])
      .reduce((prev, current) => {
        if (isCommandEntry(current)) {
          prev[current[0]] = current[1];
        }
        return prev;
      }, initial);
  }

  // A value like string or number, possible contains PII, scrub it
  return '?';
}

function isCommandObj(value) {
  return typeof value === 'object' && value !== null && !isBuffer(value);
}

function isBuffer(value) {
  let isBuffer = false;
  if (typeof Buffer !== 'undefined') {
    isBuffer = Buffer.isBuffer(value);
  }
  return isBuffer;
}

function isCommandEntry(value) {
  return Array.isArray(value);
}

const _mongoIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentMongo();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [mongodb](https://www.npmjs.com/package/mongodb) library.
 *
 * For more information, see the [`mongoIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/mongo/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.mongoIntegration()],
 * });
 * ```
 */
const mongoIntegration = core.defineIntegration(_mongoIntegration);

exports._defaultDbStatementSerializer = _defaultDbStatementSerializer;
exports.instrumentMongo = instrumentMongo;
exports.mongoIntegration = mongoIntegration;
//# sourceMappingURL=mongo.js.map
