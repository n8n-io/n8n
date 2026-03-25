Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const http = require('../integrations/http.js');
const nodeFetch = require('../integrations/node-fetch.js');
const index = require('../integrations/tracing/index.js');
const initOtel = require('./initOtel.js');

/**
 * Get default integrations, excluding performance.
 */
function getDefaultIntegrationsWithoutPerformance() {
  const nodeCoreIntegrations = nodeCore.getDefaultIntegrations();

  // Filter out the node-core HTTP and NodeFetch integrations and replace them with Node SDK's composite versions
  return nodeCoreIntegrations
    .filter(integration => integration.name !== 'Http' && integration.name !== 'NodeFetch')
    .concat(http.httpIntegration(), nodeFetch.nativeNodeFetchIntegration());
}

/** Get the default integrations for the Node SDK. */
function getDefaultIntegrations(options) {
  return [
    ...getDefaultIntegrationsWithoutPerformance(),
    // We only add performance integrations if tracing is enabled
    // Note that this means that without tracing enabled, e.g. `expressIntegration()` will not be added
    // This means that generally request isolation will work (because that is done by httpIntegration)
    // But `transactionName` will not be set automatically
    ...(core.hasSpansEnabled(options) ? index.getAutoPerformanceIntegrations() : []),
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
  core.applySdkMetadata(options, 'node');

  const client = nodeCore.init({
    ...options,
    // Only use Node SDK defaults if none provided
    defaultIntegrations: options.defaultIntegrations ?? getDefaultIntegrationsImpl(options),
  });

  // Add Node SDK specific OpenTelemetry setup
  if (client && !options.skipOpenTelemetrySetup) {
    initOtel.initOpenTelemetry(client, {
      spanProcessors: options.openTelemetrySpanProcessors,
    });
    nodeCore.validateOpenTelemetrySetup();
  }

  return client;
}

/**
 * Initialize Sentry for Node, without any integrations added by default.
 */
function initWithoutDefaultIntegrations(options = {}) {
  return _init(options, () => []);
}

exports.getDefaultIntegrations = getDefaultIntegrations;
exports.getDefaultIntegrationsWithoutPerformance = getDefaultIntegrationsWithoutPerformance;
exports.init = init;
exports.initWithoutDefaultIntegrations = initWithoutDefaultIntegrations;
//# sourceMappingURL=index.js.map
