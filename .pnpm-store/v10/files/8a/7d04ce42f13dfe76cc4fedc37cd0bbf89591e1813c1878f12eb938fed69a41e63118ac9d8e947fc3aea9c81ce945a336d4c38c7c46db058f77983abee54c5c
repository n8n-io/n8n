Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationKafkajs = require('@opentelemetry/instrumentation-kafkajs');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Kafka';

const instrumentKafka = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationKafkajs.KafkaJsInstrumentation({
      consumerHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.kafkajs.otel.consumer');
      },
      producerHook(span) {
        nodeCore.addOriginToSpan(span, 'auto.kafkajs.otel.producer');
      },
    }),
);

const _kafkaIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentKafka();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [kafkajs](https://www.npmjs.com/package/kafkajs) library.
 *
 * For more information, see the [`kafkaIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/kafka/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.kafkaIntegration()],
 * });
 */
const kafkaIntegration = core.defineIntegration(_kafkaIntegration);

exports.instrumentKafka = instrumentKafka;
exports.kafkaIntegration = kafkaIntegration;
//# sourceMappingURL=kafka.js.map
