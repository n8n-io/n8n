import { applySdkMetadata, hasSpansEnabled } from '@sentry/core';
import { init as init$1, validateOpenTelemetrySetup, getDefaultIntegrations as getDefaultIntegrations$1 } from '@sentry/node-core';
import { httpIntegration } from '../integrations/http.js';
import { nativeNodeFetchIntegration } from '../integrations/node-fetch.js';
import { getAutoPerformanceIntegrations } from '../integrations/tracing/index.js';
import { initOpenTelemetry } from './initOtel.js';

/**
 * Get default integrations, excluding performance.
 */
function getDefaultIntegrationsWithoutPerformance() {
  const nodeCoreIntegrations = getDefaultIntegrations$1();

  // Filter out the node-core HTTP and NodeFetch integrations and replace them with Node SDK's composite versions
  return nodeCoreIntegrations
    .filter(integration => integration.name !== 'Http' && integration.name !== 'NodeFetch')
    .concat(httpIntegration(), nativeNodeFetchIntegration());
}

/** Get the default integrations for the Node SDK. */
function getDefaultIntegrations(options) {
  return [
    ...getDefaultIntegrationsWithoutPerformance(),
    // We only add performance integrations if tracing is enabled
    // Note that this means that without tracing enabled, e.g. `expressIntegration()` will not be added
    // This means that generally request isolation will work (because that is done by httpIntegration)
    // But `transactionName` will not be set automatically
    ...(hasSpansEnabled(options) ? getAutoPerformanceIntegrations() : []),
  ];
}

/**
 * Initialize Sentry for Node.
 */
function init(options = {}) {
  return _init(options, getDefaultIntegrations);
}

/**
 * Internal initialization function.
 */
function _init(
  options = {},
  getDefaultIntegrationsImpl,
) {
  applySdkMetadata(options, 'node');

  const client = init$1({
    ...options,
    // Only use Node SDK defaults if none provided
    defaultIntegrations: options.defaultIntegrations ?? getDefaultIntegrationsImpl(options),
  });

  // Add Node SDK specific OpenTelemetry setup
  if (client && !options.skipOpenTelemetrySetup) {
    initOpenTelemetry(client, {
      spanProcessors: options.openTelemetrySpanProcessors,
    });
    validateOpenTelemetrySetup();
  }

  return client;
}

/**
 * Initialize Sentry for Node, without any integrations added by default.
 */
function initWithoutDefaultIntegrations(options = {}) {
  return _init(options, () => []);
}

export { getDefaultIntegrations, getDefaultIntegrationsWithoutPerformance, init, initWithoutDefaultIntegrations };
//# sourceMappingURL=index.js.map
