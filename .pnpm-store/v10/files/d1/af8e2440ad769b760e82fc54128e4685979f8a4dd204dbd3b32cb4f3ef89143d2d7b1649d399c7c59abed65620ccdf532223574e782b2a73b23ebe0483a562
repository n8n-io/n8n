import { trace, propagation, context } from '@opentelemetry/api';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_VERSION, SEMRESATTRS_SERVICE_NAMESPACE, ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SDK_VERSION, debug } from '@sentry/core';
import { setupOpenTelemetryLogger, SentryContextManager, initializeEsmLoader } from '@sentry/node-core';
import { SentrySpanProcessor, SentrySampler, SentryPropagator } from '@sentry/opentelemetry';
import { DEBUG_BUILD } from '../debug-build.js';
import { getOpenTelemetryInstrumentationToPreload } from '../integrations/tracing/index.js';

// About 277h - this must fit into new Array(len)!
const MAX_MAX_SPAN_WAIT_DURATION = 1000000;

/**
 * Initialize OpenTelemetry for Node.
 */
function initOpenTelemetry(client, options = {}) {
  if (client.getOptions().debug) {
    setupOpenTelemetryLogger();
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
  const { debug: debug$1 } = options;

  if (debug$1) {
    debug.enable();
  }

  initializeEsmLoader();

  // These are all integrations that we need to pre-load to ensure they are set up before any other code runs
  getPreloadMethods(options.integrations).forEach(fn => {
    fn();

    if (debug$1) {
      debug.log(`[Sentry] Preloaded ${fn.id} instrumentation`);
    }
  });
}

function getPreloadMethods(integrationNames) {
  const instruments = getOpenTelemetryInstrumentationToPreload();

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
  const provider = new BasicTracerProvider({
    sampler: new SentrySampler(client),
    resource: defaultResource().merge(
      resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'node',
        // eslint-disable-next-line deprecation/deprecation
        [SEMRESATTRS_SERVICE_NAMESPACE]: 'sentry',
        [ATTR_SERVICE_VERSION]: SDK_VERSION,
      }),
    ),
    forceFlushTimeoutMillis: 500,
    spanProcessors: [
      new SentrySpanProcessor({
        timeout: _clampSpanProcessorTimeout(client.getOptions().maxSpanWaitDuration),
      }),
      ...(options.spanProcessors || []),
    ],
  });

  // Register as globals
  trace.setGlobalTracerProvider(provider);
  propagation.setGlobalPropagator(new SentryPropagator());

  const ctxManager = new SentryContextManager();
  context.setGlobalContextManager(ctxManager);

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
    DEBUG_BUILD &&
      debug.warn(`\`maxSpanWaitDuration\` is too high, using the maximum value of ${MAX_MAX_SPAN_WAIT_DURATION}`);
    return MAX_MAX_SPAN_WAIT_DURATION;
  } else if (maxSpanWaitDuration <= 0 || Number.isNaN(maxSpanWaitDuration)) {
    DEBUG_BUILD && debug.warn('`maxSpanWaitDuration` must be a positive number, using default value instead.');
    return undefined;
  }

  return maxSpanWaitDuration;
}

export { _clampSpanProcessorTimeout, initOpenTelemetry, preloadOpenTelemetry, setupOtel };
//# sourceMappingURL=initOtel.js.map
