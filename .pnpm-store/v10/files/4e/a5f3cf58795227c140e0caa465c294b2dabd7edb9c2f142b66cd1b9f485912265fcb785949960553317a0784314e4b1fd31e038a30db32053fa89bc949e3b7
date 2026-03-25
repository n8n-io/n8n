Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationKoa = require('@opentelemetry/instrumentation-koa');
const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const debugBuild = require('../../debug-build.js');

const INTEGRATION_NAME = 'Koa';

const instrumentKoa = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  instrumentationKoa.KoaInstrumentation,
  (options = {}) => {
    return {
      ignoreLayersType: options.ignoreLayersType ,
      requestHook(span, info) {
        nodeCore.addOriginToSpan(span, 'auto.http.otel.koa');

        const attributes = core.spanToJSON(span).data;

        // this is one of: middleware, router
        const type = attributes['koa.type'];
        if (type) {
          span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_OP, `${type}.koa`);
        }

        // Also update the name
        const name = attributes['koa.name'];
        if (typeof name === 'string') {
          // Somehow, name is sometimes `''` for middleware spans
          // See: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/2220
          span.updateName(name || '< unknown >');
        }

        if (core.getIsolationScope() === core.getDefaultIsolationScope()) {
          debugBuild.DEBUG_BUILD && core.debug.warn('Isolation scope is default isolation scope - skipping setting transactionName');
          return;
        }
        const route = attributes[semanticConventions.ATTR_HTTP_ROUTE];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const method = info.context?.request?.method?.toUpperCase() || 'GET';
        if (route) {
          core.getIsolationScope().setTransactionName(`${method} ${route}`);
        }
      },
    } ;
  },
);

const _koaIntegration = ((options = {}) => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      instrumentKoa(options);
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for [Koa](https://koajs.com/).
 *
 * If you also want to capture errors, you need to call `setupKoaErrorHandler(app)` after you set up your Koa server.
 *
 * For more information, see the [koa documentation](https://docs.sentry.io/platforms/javascript/guides/koa/).
 *
 * @param {KoaOptions} options Configuration options for the Koa integration.
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [Sentry.koaIntegration()],
 * })
 * ```
 *
 * @example
 * ```javascript
 * // To ignore middleware spans
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *   integrations: [
 *     Sentry.koaIntegration({
 *       ignoreLayersType: ['middleware']
 *     })
 *   ],
 * })
 * ```
 */
const koaIntegration = core.defineIntegration(_koaIntegration);

/**
 * Add an Koa error handler to capture errors to Sentry.
 *
 * The error handler must be before any other middleware and after all controllers.
 *
 * @param app The Express instances
 * @param options {ExpressHandlerOptions} Configuration options for the handler
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 * const Koa = require("koa");
 *
 * const app = new Koa();
 *
 * Sentry.setupKoaErrorHandler(app);
 *
 * // Add your routes, etc.
 *
 * app.listen(3000);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setupKoaErrorHandler = (app) => {
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      core.captureException(error, {
        mechanism: {
          handled: false,
          type: 'auto.middleware.koa',
        },
      });
      throw error;
    }
  });

  nodeCore.ensureIsWrapped(app.use, 'koa');
};

exports.instrumentKoa = instrumentKoa;
exports.koaIntegration = koaIntegration;
exports.setupKoaErrorHandler = setupKoaErrorHandler;
//# sourceMappingURL=koa.js.map
