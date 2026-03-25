Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationKnex = require('@opentelemetry/instrumentation-knex');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');

const INTEGRATION_NAME = 'Knex';

const instrumentKnex = nodeCore.generateInstrumentOnce(
  INTEGRATION_NAME,
  () => new instrumentationKnex.KnexInstrumentation({ requireParentSpan: true }),
);

const _knexIntegration = (() => {
  let instrumentationWrappedCallback;

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      const instrumentation = instrumentKnex();
      instrumentationWrappedCallback = nodeCore.instrumentWhenWrapped(instrumentation);
    },

    setup(client) {
      instrumentationWrappedCallback?.(() =>
        client.on('spanStart', span => {
          const { data } = core.spanToJSON(span);
          // knex.version is always set in the span data
          // https://github.com/open-telemetry/opentelemetry-js-contrib/blob/0309caeafc44ac9cb13a3345b790b01b76d0497d/plugins/node/opentelemetry-instrumentation-knex/src/instrumentation.ts#L138
          if ('knex.version' in data) {
            span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.knex');
          }
        }),
      );
    },
  };
}) ;

/**
 * Knex integration
 *
 * Capture tracing data for [Knex](https://knexjs.org/).
 *
 * @example
 * ```javascript
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *  integrations: [Sentry.knexIntegration()],
 * });
 * ```
 */
const knexIntegration = core.defineIntegration(_knexIntegration);

exports.instrumentKnex = instrumentKnex;
exports.knexIntegration = knexIntegration;
//# sourceMappingURL=knex.js.map
