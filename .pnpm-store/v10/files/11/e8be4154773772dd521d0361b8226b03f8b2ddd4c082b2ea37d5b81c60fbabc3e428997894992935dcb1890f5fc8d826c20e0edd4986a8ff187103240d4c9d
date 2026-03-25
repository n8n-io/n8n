import { AmqplibInstrumentation } from '@opentelemetry/instrumentation-amqplib';
import { defineIntegration } from '@sentry/core';
import { generateInstrumentOnce, addOriginToSpan } from '@sentry/node-core';

const INTEGRATION_NAME = 'Amqplib';

const config = {
  consumeEndHook: (span) => {
    addOriginToSpan(span, 'auto.amqplib.otel.consumer');
  },
  publishHook: (span) => {
    addOriginToSpan(span, 'auto.amqplib.otel.publisher');
  },
};

const instrumentAmqplib = generateInstrumentOnce(INTEGRATION_NAME, () => new AmqplibInstrumentation(config));

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
const amqplibIntegration = defineIntegration(_amqplibIntegration);

export { amqplibIntegration, instrumentAmqplib };
//# sourceMappingURL=amqplib.js.map
