import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';

const INTEGRATION_NAME = 'Mongo';

const instrumentMongo = generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new MongoDBInstrumentation({
      dbStatementSerializer: _defaultDbStatementSerializer,
      responseHook(span) {
        addOriginToSpan(span, 'auto.db.otel.mongo');
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
const mongoIntegration = defineIntegration(_mongoIntegration);

export { _defaultDbStatementSerializer, instrumentMongo, mongoIntegration };
//# sourceMappingURL=mongo.js.map
