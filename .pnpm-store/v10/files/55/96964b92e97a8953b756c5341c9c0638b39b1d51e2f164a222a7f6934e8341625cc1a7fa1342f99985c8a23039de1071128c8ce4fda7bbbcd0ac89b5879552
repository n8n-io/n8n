Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('@opentelemetry/api');
const resources = require('@opentelemetry/resources');
const sdkTraceBase = require('@opentelemetry/sdk-trace-base');
const semanticConventions = require('@opentelemetry/semantic-conventions');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const opentelemetry = require('@sentry/opentelemetry');
const debugBuild = require('../debug-build.js');
const index = require('../integrations/tracing/index.js');

// About 277h - this must fit into new Array(len)!
const MAX_MAX_SPAN_WAIT_DURATION = 1000000;

/**
 * Initialize OpenTelemetry for Node.
 */
function initOpenTelemetry(client, options = {}) {
  if (client.getOptions().debug) {
    nodeCore.setupOpenTelemetryLogger();
  }

  const [provider, asyncLocalStorageLookup] = setupOtel(client, options);
  client.traceProvider = provider;
  client.asyncLocalStorageLookup = asyncLocalStorageLookup;
}

/**
 * Preload OpenTelemetry for Node.
 * This can be used to preload instrumentation early, but set up Sentry later.
 * By preloading the OTEL instrumentation wrapping still happens early enough that everything works.
 */
function preloadOpenTelemetry(options = {}) {
  const { debug } = options;

  if (debug) {
    core.debug.enable();
  }

  nodeCore.initializeEsmLoader();

  // These are all integrations that we need to pre-load to ensure they are set up before any other code runs
  getPreloadMethods(options.integrations).forEach(fn => {
    fn();

    if (debug) {
      core.debug.log(`[Sentry] Preloaded ${fn.id} instrumentation`);
    }
  });
}

function getPreloadMethods(integrationNames) {
  const instruments = index.getOpenTelemetryInstrumentationToPreload();

  if (!integrationNames) {
    return instruments;
  }

  // We match exact matches of instrumentation, but also match prefixes, e.g. "Fastify.v5" will match "Fastify"
  return instruments.filter(instrumentation => {
    const id = instrumentation.id;
    return integrationNames.some(integrationName => id === integrationName || id.startsWith(`${integrationName}.`));
  });
}

/** Just exported for tests. */
function setupOtel(
  client,
  options = {},
) {
  // Create and configure NodeTracerProvider
  const provider = new sdkTraceBase.BasicTracerProvider({
    sampler: new opentelemetry.SentrySampler(client),
    resource: resources.defaultResource().merge(
      resources.resourceFromAttributes({
        [semanticConventions.ATTR_SERVICE_NAME]: 'node',
        // eslint-disable-next-line deprecation/deprecation
        [semanticConventions.SEMRESATTRS_SERVICE_NAMESPACE]: 'sentry',
        [semanticConventions.ATTR_SERVICE_VERSION]: core.SDK_VERSION,
      }),
    ),
    forceFlushTimeoutMillis: 500,
    spanProcessors: [
      new opentelemetry.SentrySpanProcessor({
        timeout: _clampSpanProcessorTimeout(client.getOptions().maxSpanWaitDuration),
      }),
      ...(options.spanProcessors || []),
    ],
  });

  // Register as globals
  api.trace.setGlobalTracerProvider(provider);
  api.propagation.setGlobalPropagator(new opentelemetry.SentryPropagator());

  const ctxManager = new nodeCore.SentryContextManager();
  api.context.setGlobalContextManager(ctxManager);

  return [provider, ctxManager.getAsyncLocalStorageLookup()];
}

/** Just exported for tests. */
function _clampSpanProcessorTimeout(maxSpanWaitDuration) {
  if (maxSpanWaitDuration == null) {
    return undefined;
  }

  // We guard for a max. value here, because we create an array with this length
  // So if this value is too large, this would fail
  if (maxSpanWaitDuration > MAX_MAX_SPAN_WAIT_DURATION) {
    debugBuild.DEBUG_BUILD &&
      core.debug.warn(`\`maxSpanWaitDuration\` is too high, using the maximum value of ${MAX_MAX_SPAN_WAIT_DURATION}`);
    return MAX_MAX_SPAN_WAIT_DURATION;
  } else if (maxSpanWaitDuration <= 0 || Number.isNaN(maxSpanWaitDuration)) {
    debugBuild.DEBUG_BUILD && core.debug.warn('`maxSpanWaitDuration` must be a positive number, using default value instead.');
    return undefined;
  }

  return maxSpanWaitDuration;
}

exports._clampSpanProcessorTimeout = _clampSpanProcessorTimeout;
exports.initOpenTelemetry = initOpenTelemetry;
exports.preloadOpenTelemetry = preloadOpenTelemetry;
exports.setupOtel = setupOtel;
//# sourceMappingURL=initOtel.js.map
