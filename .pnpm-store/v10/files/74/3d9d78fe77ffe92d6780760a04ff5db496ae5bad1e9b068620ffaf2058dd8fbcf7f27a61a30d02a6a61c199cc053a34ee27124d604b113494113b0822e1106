import { eventFiltersIntegration, functionToStringIntegration, linkedErrorsIntegration, requestDataIntegration, consoleIntegration, debug, consoleSandbox, getCurrentScope, applySdkMetadata, envToBool, stackParserFromStackParserOptions, getIntegrationsToSetup, propagationContextFromHeaders } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { childProcessIntegration } from '../integrations/childProcess.js';
import { nodeContextIntegration } from '../integrations/context.js';
import { contextLinesIntegration } from '../integrations/contextlines.js';
import { localVariablesIntegration } from '../integrations/local-variables/index.js';
import { modulesIntegration } from '../integrations/modules.js';
import { onUncaughtExceptionIntegration } from '../integrations/onuncaughtexception.js';
import { onUnhandledRejectionIntegration } from '../integrations/onunhandledrejection.js';
import { processSessionIntegration } from '../integrations/processSession.js';
import { INTEGRATION_NAME, spotlightIntegration } from '../integrations/spotlight.js';
import { systemErrorIntegration } from '../integrations/systemError.js';
import { defaultStackParser, getSentryRelease } from '../sdk/api.js';
import { makeNodeTransport } from '../transports/http.js';
import { isCjs } from '../utils/detection.js';
import { getSpotlightConfig } from '../utils/spotlight.js';
import { setAsyncLocalStorageAsyncContextStrategy } from './asyncLocalStorageStrategy.js';
import { LightNodeClient } from './client.js';
import { httpIntegration } from './integrations/httpIntegration.js';
import { nativeNodeFetchIntegration } from './integrations/nativeNodeFetchIntegration.js';

/**
 * Get default integrations for the Light Node-Core SDK.
 */
function getDefaultIntegrations() {
  return [
    // Common
    eventFiltersIntegration(),
    functionToStringIntegration(),
    linkedErrorsIntegration(),
    requestDataIntegration(),
    systemErrorIntegration(),
    // Native Wrappers
    consoleIntegration(),
    httpIntegration(),
    nativeNodeFetchIntegration(),
    // Global Handlers
    onUncaughtExceptionIntegration(),
    onUnhandledRejectionIntegration(),
    // Event Info
    contextLinesIntegration(),
    localVariablesIntegration(),
    nodeContextIntegration(),
    childProcessIntegration(),
    processSessionIntegration(),
    modulesIntegration(),
  ];
}

/**
 * Initialize Sentry for Node in light mode (without OpenTelemetry).
 */
function init(options = {}) {
  return _init(options, getDefaultIntegrations);
}

/**
 * Initialize Sentry for Node in light mode, without any integrations added by default.
 */
function initWithoutDefaultIntegrations(options = {}) {
  return _init(options, () => []);
}

/**
 * Initialize Sentry for Node in light mode.
 */
function _init(
  _options = {},
  getDefaultIntegrationsImpl,
) {
  const options = getClientOptions(_options, getDefaultIntegrationsImpl);

  if (options.debug === true) {
    if (DEBUG_BUILD) {
      debug.enable();
    } else {
      // use `console.warn` rather than `debug.warn` since by non-debug bundles have all `debug.x` statements stripped
      consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.warn('[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.');
      });
    }
  }

  // Use AsyncLocalStorage-based context strategy instead of OpenTelemetry
  setAsyncLocalStorageAsyncContextStrategy();

  const scope = getCurrentScope();
  scope.update(options.initialScope);

  if (options.spotlight && !options.integrations.some(({ name }) => name === INTEGRATION_NAME)) {
    options.integrations.push(
      spotlightIntegration({
        sidecarUrl: typeof options.spotlight === 'string' ? options.spotlight : undefined,
      }),
    );
  }

  applySdkMetadata(options, 'node-light', ['node-core']);

  const client = new LightNodeClient(options);
  // The client is on the current scope, from where it generally is inherited
  getCurrentScope().setClient(client);

  client.init();

  debug.log(`SDK initialized from ${isCjs() ? 'CommonJS' : 'ESM'} (light mode)`);

  client.startClientReportTracking();

  updateScopeFromEnvVariables();

  // Ensure we flush events when vercel functions are ended
  // See: https://vercel.com/docs/functions/functions-api-reference#sigterm-signal
  if (process.env.VERCEL) {
    process.on('SIGTERM', async () => {
      // We have 500ms for processing here, so we try to make sure to have enough time to send the events
      await client.flush(200);
    });
  }

  return client;
}

function getClientOptions(
  options,
  getDefaultIntegrationsImpl,
) {
  const release = getRelease(options.release);
  const spotlight = getSpotlightConfig(options.spotlight);
  const tracesSampleRate = getTracesSampleRate(options.tracesSampleRate);

  const mergedOptions = {
    ...options,
    dsn: options.dsn ?? process.env.SENTRY_DSN,
    environment: options.environment ?? process.env.SENTRY_ENVIRONMENT,
    sendClientReports: options.sendClientReports ?? true,
    transport: options.transport ?? makeNodeTransport,
    stackParser: stackParserFromStackParserOptions(options.stackParser || defaultStackParser),
    release,
    tracesSampleRate,
    spotlight,
    debug: envToBool(options.debug ?? process.env.SENTRY_DEBUG),
  };

  const integrations = options.integrations;
  const defaultIntegrations = options.defaultIntegrations ?? getDefaultIntegrationsImpl(mergedOptions);

  return {
    ...mergedOptions,
    integrations: getIntegrationsToSetup({
      defaultIntegrations,
      integrations,
    }),
  };
}

function getRelease(release) {
  if (release !== undefined) {
    return release;
  }

  const detectedRelease = getSentryRelease();
  if (detectedRelease !== undefined) {
    return detectedRelease;
  }

  return undefined;
}

function getTracesSampleRate(tracesSampleRate) {
  if (tracesSampleRate !== undefined) {
    return tracesSampleRate;
  }

  const sampleRateFromEnv = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (!sampleRateFromEnv) {
    return undefined;
  }

  const parsed = parseFloat(sampleRateFromEnv);
  return isFinite(parsed) ? parsed : undefined;
}

/**
 * Update scope and propagation context based on environmental variables.
 *
 * See https://github.com/getsentry/rfcs/blob/main/text/0071-continue-trace-over-process-boundaries.md
 * for more details.
 */
function updateScopeFromEnvVariables() {
  if (envToBool(process.env.SENTRY_USE_ENVIRONMENT) !== false) {
    const sentryTraceEnv = process.env.SENTRY_TRACE;
    const baggageEnv = process.env.SENTRY_BAGGAGE;
    const propagationContext = propagationContextFromHeaders(sentryTraceEnv, baggageEnv);
    getCurrentScope().setPropagationContext(propagationContext);
  }
}

export { getDefaultIntegrations, init, initWithoutDefaultIntegrations };
//# sourceMappingURL=sdk.js.map
