import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';

const INTEGRATION_NAME = 'Kafka';

const instrumentKafka = generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new KafkaJsInstrumentation({
      consumerHook(span) {
        addOriginToSpan(span, 'auto.kafkajs.otel.consumer');
      },
      producerHook(span) {
        addOriginToSpan(span, 'auto.kafkajs.otel.producer');
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
const kafkaIntegration = defineIntegration(_kafkaIntegration);

export { instrumentKafka, kafkaIntegration };
//# sourceMappingURL=kafka.js.map
