Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationMongoose = require('@opentelemetry/instrumentation-mongoose');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Mongoose';

const instrumentMongoose = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationMongoose.MongooseInstrumentation({
      responseHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.db.otel.mongoose');
      },
    }),
);

const _mongooseIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentMongoose();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [mongoose](https://www.npmjs.com/package/mongoose) library.
 *
 * For more information, see the [`mongooseIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/mongoose/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.mongooseIntegration()],
 * });
 * ```
 */
const mongooseIntegration = core.defineIntegration(_mongooseIntegration);

exports.instrumentMongoose = instrumentMongoose;
exports.mongooseIntegration = mongooseIntegration;
//# sourceMappingURL=mongoose.js.map
