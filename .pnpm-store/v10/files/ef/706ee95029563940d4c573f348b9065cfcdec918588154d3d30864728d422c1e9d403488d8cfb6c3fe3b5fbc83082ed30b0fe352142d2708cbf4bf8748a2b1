Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationAmqplib = require('@opentelemetry/instrumentation-amqplib');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Amqplib';

const config = {
  consumeEndHook: (span) => {
    nodeCore.addOriginToSpan(span, 'auto.amqplib.otel.consumer');
  },
  publishHook: (span) => {
    nodeCore.addOriginToSpan(span, 'auto.amqplib.otel.publisher');
  },
};

const instrumentAmqplib = nodeCore.generateInstrumentOnce(INTEGRATION_NAME, () => new instrumentationAmqplib.AmqplibInstrumentation(config));

const _amqplibIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentAmqplib();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [amqplib](https://www.npmjs.com/package/amqplib) library.
 *
 * For more information, see the [`amqplibIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/amqplib/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.amqplibIntegration()],
 * });
 * ```
 */
const amqplibIntegration = core.defineIntegration(_amqplibIntegration);

exports.amqplibIntegration = amqplibIntegration;
exports.instrumentAmqplib = instrumentAmqplib;
//# sourceMappingURL=amqplib.js.map
