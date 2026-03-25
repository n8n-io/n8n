import { HapiInstrumentation } from '@opentelemetry/instrumentation-hapi';
import { defineIntegration, SDK_VERSION, getClient, getIsolationScope, getDefaultIsolationScope, debug, spanToJSON, SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, captureException } from '@sentry/core';
import { generateInstrumentOnce, ensureIsWrapped } from '@sentry/node-core';
import { DEBUG_BUILD } from '../../../debug-build.js';

const INTEGRATION_NAME = 'Hapi';

const instrumentHapi = generateInstrumentOnce(INTEGRATION_NAME, () => new HapiInstrumentation());

const _hapiIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentHapi();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for [Hapi](https://hapi.dev/).
 *
 * If you also want to capture errors, you need to call `setupHapiErrorHandler(server)` after you set up your server.
 *
 * For more information, see the [hapi documentation](https://docs.sentry.io/platforms/javascript/guides/hapi/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [Sentry.hapiIntegration()],
 * })
 * ```
 */
const hapiIntegration = defineIntegration(_hapiIntegration);

function isErrorEvent(event) {
  return !!(event && typeof event === 'object' && 'error' in event && event.error);
}

function sendErrorToSentry(errorData) {
  captureException(errorData, {
    mechanism: {
      type: 'auto.function.hapi',
      handled: false,
    },
  });
}

const hapiErrorPlugin = {
  name: 'SentryHapiErrorPlugin',
  version: SDK_VERSION,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: async function (serverArg) {
    const server = serverArg ;

    server.events.on({ name: 'request', channels: ['error'] }, (request, event) => {
      if (getIsolationScope() !== getDefaultIsolationScope()) {
        const route = request.route;
        if (route.path) {
          getIsolationScope().setTransactionName(`${route.method.toUpperCase()} ${route.path}`);
        }
      } else {
        DEBUG_BUILD &&
          debug.warn('Isolation scope is still the default isolation scope - skipping setting transactionName');
      }

      if (isErrorEvent(event)) {
        sendErrorToSentry(event.error);
      }
    });
  },
};

/**
 * Add a Hapi plugin to capture errors to Sentry.
 *
 * @param server The Hapi server to attach the error handler to
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 * const Hapi = require('@hapi/hapi');
 *
 * const init = async () => {
 *   const server = Hapi.server();
 *
 *   // all your routes here
 *
 *   await Sentry.setupHapiErrorHandler(server);
 *
 *   await server.start();
 * };
 * ```
 */
async function setupHapiErrorHandler(server) {
  await server.register(hapiErrorPlugin);

  // Sadly, middleware spans do not go through `requestHook`, so we handle those here
  // We register this hook in this method, because if we register it in the integration `setup`,
  // it would always run even for users that are not even using hapi
  const client = getClient();
  if (client) {
    client.on('spanStart', span => {
      addHapiSpanAttributes(span);
    });
  }

  ensureIsWrapped(server.register, 'hapi');
}

function addHapiSpanAttributes(span) {
  const attributes = spanToJSON(span).data;

  // this is one of: router, plugin, server.ext
  const type = attributes['hapi.type'];

  // If this is already set, or we have no Hapi span, no need to process again...
  if (attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP] || !type) {
    return;
  }

  span.setAttributes({
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.hapi',
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: `${type}.hapi`,
  });
}

export { hapiErrorPlugin, hapiIntegration, instrumentHapi, setupHapiErrorHandler };
//# sourceMappingURL=index.js.map
