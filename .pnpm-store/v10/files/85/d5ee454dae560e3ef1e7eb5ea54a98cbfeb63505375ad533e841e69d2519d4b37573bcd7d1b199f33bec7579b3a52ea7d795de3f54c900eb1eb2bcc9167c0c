Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationExpress = require('@opentelemetry/instrumentation-express');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const debugBuild = require('../../debug-build.js');

const INTEGRATION_NAME = 'Express';

function requestHook(span) {
  nodeCore.addOriginToSpan(span, 'auto.http.otel.express');

  const attributes = core.spanToJSON(span).data;
  // this is one of: middleware, request_handler, router
  const type = attributes['express.type'];

  if (type) {
    span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_OP, `${type}.express`);
  }

  // Also update the name, we don't need to "middleware - " prefix
  const name = attributes['express.name'];
  if (typeof name === 'string') {
    span.updateName(name);
  }
}

function spanNameHook(info, defaultName) {
  if (core.getIsolationScope() === core.getDefaultIsolationScope()) {
    debugBuild.DEBUG_BUILD && core.debug.warn('Isolation scope is still default isolation scope - skipping setting transactionName');
    return defaultName;
  }
  if (info.layerType === 'request_handler') {
    // type cast b/c Otel unfortunately types info.request as any :(
    const req = info.request ;
    const method = req.method ? req.method.toUpperCase() : 'GET';
    core.getIsolationScope().setTransactionName(`${method} ${info.route}`);
  }
  return defaultName;
}

const instrumentExpress = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () =>
    new instrumentationExpress.ExpressInstrumentation({
      requestHook: span => requestHook(span),
      spanNameHook: (info, defaultName) => spanNameHook(info, defaultName),
    }),
);

const _expressIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentExpress();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for [Express](https://expressjs.com/).
 *
 * If you also want to capture errors, you need to call `setupExpressErrorHandler(app)` after you set up your Express server.
 *
 * For more information, see the [express documentation](https://docs.sentry.io/platforms/javascript/guides/express/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [Sentry.expressIntegration()],
 * })
 * ```
 */
const expressIntegration = core.defineIntegration(_expressIntegration);

/**
 * An Express-compatible error handler.
 */
function expressErrorHandler(options) {
  return function sentryErrorMiddleware(
    error,
    request,
    res,
    next,
  ) {
    const normalizedRequest = core.httpRequestToRequestData(request);
    // Ensure we use the express-enhanced request here, instead of the plain HTTP one
    // When an error happens, the `expressRequestHandler` middleware does not run, so we set it here too
    core.getIsolationScope().setSDKProcessingMetadata({ normalizedRequest });

    const shouldHandleError = options?.shouldHandleError || defaultShouldHandleError;

    if (shouldHandleError(error)) {
      const eventId = core.captureException(error, { mechanism: { type: 'auto.middleware.express', handled: false } });
      (res ).sentry = eventId;
    }

    next(error);
  };
}

function expressRequestHandler() {
  return function sentryRequestMiddleware(
    request,
    _res,
    next,
  ) {
    const normalizedRequest = core.httpRequestToRequestData(request);
    // Ensure we use the express-enhanced request here, instead of the plain HTTP one
    core.getIsolationScope().setSDKProcessingMetadata({ normalizedRequest });

    next();
  };
}

/**
 * Add an Express error handler to capture errors to Sentry.
 *
 * The error handler must be before any other middleware and after all controllers.
 *
 * @param app The Express instances
 * @param options {ExpressHandlerOptions} Configuration options for the handler
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 * const express = require("express");
 *
 * const app = express();
 *
 * // Add your routes, etc.
 *
 * // Add this after all routes,
 * // but before any and other error-handling middlewares are defined
 * Sentry.setupExpressErrorHandler(app);
 *
 * app.listen(3000);
 * ```
 */
function setupExpressErrorHandler(
  app,
  options,
) {
  app.use(expressRequestHandler());
  app.use(expressErrorHandler(options));
  nodeCore.ensureIsWrapped(app.use, 'express');
}

function getStatusCodeFromResponse(error) {
  const statusCode = error.status || error.statusCode || error.status_code || error.output?.statusCode;
  return statusCode ? parseInt(statusCode , 10) : 500;
}

/** Returns true if response code is internal server error */
function defaultShouldHandleError(error) {
  const status = getStatusCodeFromResponse(error);
  return status >= 500;
}

exports.expressErrorHandler = expressErrorHandler;
exports.expressIntegration = expressIntegration;
exports.instrumentExpress = instrumentExpress;
exports.setupExpressErrorHandler = setupExpressErrorHandler;
//# sourceMappingURL=express.js.map
