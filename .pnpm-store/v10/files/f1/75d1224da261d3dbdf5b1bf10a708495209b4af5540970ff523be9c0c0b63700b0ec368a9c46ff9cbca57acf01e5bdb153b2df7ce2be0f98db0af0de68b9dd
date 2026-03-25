Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const dc = require('node:diagnostics_channel');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const debugBuild = require('../../../debug-build.js');
const index = require('./fastify-otel/index.js');
const instrumentation = require('./v3/instrumentation.js');

/**
 * Options for the Fastify integration.
 *
 * `shouldHandleError` - Callback method deciding whether error should be captured and sent to Sentry
 * This is used on Fastify v5 where Sentry handles errors in the diagnostics channel.
 * Fastify v3 and v4 use `setupFastifyErrorHandler` instead.
 *
 * @example
 *
 * ```javascript
 * Sentry.init({
 *   integrations: [
 *     Sentry.fastifyIntegration({
 *       shouldHandleError(_error, _request, reply) {
 *         return reply.statusCode >= 500;
 *       },
 *     });
 *   },
 * });
 * ```
 *
 */

const INTEGRATION_NAME = 'Fastify';

const instrumentFastifyV3 = nodeCore.generateInstrumentOnce(
  `${INTEGRATION_NAME}.v3`,
  () => new instrumentation.FastifyInstrumentationV3(),
);

function getFastifyIntegration() {
  const client = core.getClient();
  if (!client) {
    return undefined;
  } else {
    return client.getIntegrationByName(INTEGRATION_NAME);
  }
}

function handleFastifyError(

  error,
  request,
  reply,
  handlerOrigin,
) {
  const shouldHandleError = getFastifyIntegration()?.getShouldHandleError() || defaultShouldHandleError;
  // Diagnostics channel runs before the onError hook, so we can use it to check if the handler was already registered
  if (handlerOrigin === 'diagnostics-channel') {
    this.diagnosticsChannelExists = true;
  }

  if (this.diagnosticsChannelExists && handlerOrigin === 'onError-hook') {
    debugBuild.DEBUG_BUILD &&
      core.debug.warn(
        'Fastify error handler was already registered via diagnostics channel.',
        'You can safely remove `setupFastifyErrorHandler` call and set `shouldHandleError` on the integration options.',
      );

    // If the diagnostics channel already exists, we don't need to handle the error again
    return;
  }

  if (shouldHandleError(error, request, reply)) {
    core.captureException(error, { mechanism: { handled: false, type: 'auto.function.fastify' } });
  }
}

const instrumentFastify = nodeCore.generateInstrumentOnce(`${INTEGRATION_NAME}.v5`, () => {
  const fastifyOtelInstrumentationInstance = new index.FastifyOtelInstrumentation();
  const plugin = fastifyOtelInstrumentationInstance.plugin();

  // This message handler works for Fastify versions 3, 4 and 5
  dc.subscribe('fastify.initialization', message => {
    const fastifyInstance = (message ).fastify;

    fastifyInstance?.register(plugin).after(err => {
      if (err) {
        debugBuild.DEBUG_BUILD && core.debug.error('Failed to setup Fastify instrumentation', err);
      } else {
        instrumentClient();

        if (fastifyInstance) {
          instrumentOnRequest(fastifyInstance);
        }
      }
    });
  });

  // This diagnostics channel only works on Fastify version 5
  // For versions 3 and 4, we use `setupFastifyErrorHandler` instead
  dc.subscribe('tracing:fastify.request.handler:error', message => {
    const { error, request, reply } = message

;

    handleFastifyError.call(handleFastifyError, error, request, reply, 'diagnostics-channel');
  });

  // Returning this as unknown not to deal with the internal types of the FastifyOtelInstrumentation
  return fastifyOtelInstrumentationInstance ;
});

const _fastifyIntegration = (({ shouldHandleError }) => {
  let _shouldHandleError;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      _shouldHandleError = shouldHandleError || defaultShouldHandleError;

      instrumentFastifyV3();
      instrumentFastify();
    },
    getShouldHandleError() {
      return _shouldHandleError;
    },
    setShouldHandleError(fn) {
      _shouldHandleError = fn;
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for [Fastify](https://fastify.dev/).
 *
 * If you also want to capture errors, you need to call `setupFastifyErrorHandler(app)` after you set up your Fastify server.
 *
 * For more information, see the [fastify documentation](https://docs.sentry.io/platforms/javascript/guides/fastify/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [Sentry.fastifyIntegration()],
 * })
 * ```
 */
const fastifyIntegration = core.defineIntegration((options = {}) =>
  _fastifyIntegration(options),
);

/**
 * Default function to determine if an error should be sent to Sentry
 *
 * 3xx and 4xx errors are not sent by default.
 */
function defaultShouldHandleError(_error, _request, reply) {
  const statusCode = reply.statusCode;
  // 3xx and 4xx errors are not sent by default.
  return statusCode >= 500 || statusCode <= 299;
}

/**
 * Add an Fastify error handler to capture errors to Sentry.
 *
 * @param fastify The Fastify instance to which to add the error handler
 * @param options Configuration options for the handler
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 * const Fastify = require("fastify");
 *
 * const app = Fastify();
 *
 * Sentry.setupFastifyErrorHandler(app);
 *
 * // Add your routes, etc.
 *
 * app.listen({ port: 3000 });
 * ```
 */
function setupFastifyErrorHandler(fastify, options) {
  if (options?.shouldHandleError) {
    getFastifyIntegration()?.setShouldHandleError(options.shouldHandleError);
  }

  const plugin = Object.assign(
    function (fastify, _options, done) {
      fastify.addHook('onError', async (request, reply, error) => {
        handleFastifyError.call(handleFastifyError, error, request, reply, 'onError-hook');
      });
      done();
    },
    {
      [Symbol.for('skip-override')]: true,
      [Symbol.for('fastify.display-name')]: 'sentry-fastify-error-handler',
    },
  );

  fastify.register(plugin);
}

function addFastifySpanAttributes(span) {
  const spanJSON = core.spanToJSON(span);
  const spanName = spanJSON.description;
  const attributes = spanJSON.data;

  const type = attributes['fastify.type'];

  const isHook = type === 'hook';
  const isHandler = type === spanName?.startsWith('handler -');
  // In @fastify/otel `request-handler` is separated by dash, not underscore
  const isRequestHandler = spanName === 'request' || type === 'request-handler';

  // If this is already set, or we have no fastify span, no need to process again...
  if (attributes[core.SEMANTIC_ATTRIBUTE_SENTRY_OP] || (!isHandler && !isRequestHandler && !isHook)) {
    return;
  }

  const opPrefix = isHook ? 'hook' : isHandler ? 'middleware' : isRequestHandler ? 'request-handler' : '<unknown>';

  span.setAttributes({
    [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.fastify',
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: `${opPrefix}.fastify`,
  });

  const attrName = attributes['fastify.name'] || attributes['plugin.name'] || attributes['hook.name'];
  if (typeof attrName === 'string') {
    // Try removing `fastify -> ` and `@fastify/otel -> ` prefixes
    // This is a bit of a hack, and not always working for all spans
    // But it's the best we can do without a proper API
    const updatedName = attrName.replace(/^fastify -> /, '').replace(/^@fastify\/otel -> /, '');

    span.updateName(updatedName);
  }
}

function instrumentClient() {
  const client = core.getClient();
  if (client) {
    client.on('spanStart', (span) => {
      addFastifySpanAttributes(span);
    });
  }
}

function instrumentOnRequest(fastify) {
  fastify.addHook('onRequest', async (request, _reply) => {
    if (request.opentelemetry) {
      const { span } = request.opentelemetry();

      if (span) {
        addFastifySpanAttributes(span);
      }
    }

    const routeName = request.routeOptions?.url;
    const method = request.method || 'GET';

    core.getIsolationScope().setTransactionName(`${method} ${routeName}`);
  });
}

exports.fastifyIntegration = fastifyIntegration;
exports.instrumentFastify = instrumentFastify;
exports.instrumentFastifyV3 = instrumentFastifyV3;
exports.setupFastifyErrorHandler = setupFastifyErrorHandler;
//# sourceMappingURL=index.js.map
