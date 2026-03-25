const nodeCore = require('@sentry/node-core');
const initOtel = require('./sdk/initOtel.js');

const debug = nodeCore.envToBool(process.env.SENTRY_DEBUG);
const integrationsStr = process.env.SENTRY_PRELOAD_INTEGRATIONS;

const integrations = integrationsStr ? integrationsStr.split(',').map(integration => integration.trim()) : undefined;

/**
 * The @sentry/node/preload export can be used with the node --import and --require args to preload the OTEL
 * instrumentation, without initializing the Sentry SDK.
 *
 * This is useful if you cannot initialize the SDK immediately, but still want to preload the instrumentation,
 * e.g. if you have to load the DSN from somewhere else.
 *
 * You can configure this in two ways via environment variables:
 * - `SENTRY_DEBUG` to enable debug logging
 * - `SENTRY_PRELOAD_INTEGRATIONS` to preload specific integrations - e.g. `SENTRY_PRELOAD_INTEGRATIONS="Http,Express"`
 */
initOtel.preloadOpenTelemetry({ debug, integrations });
//# sourceMappingURL=preload.js.map
