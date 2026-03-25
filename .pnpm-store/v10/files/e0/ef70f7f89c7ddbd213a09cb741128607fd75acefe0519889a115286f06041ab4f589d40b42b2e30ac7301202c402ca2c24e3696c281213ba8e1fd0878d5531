Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const contextAsyncHooks = require('@opentelemetry/context-async-hooks');
const opentelemetry = require('@sentry/opentelemetry');

/**
 * This is a custom ContextManager for OpenTelemetry, which extends the default AsyncLocalStorageContextManager.
 * It ensures that we create a new hub per context, so that the OTEL Context & the Sentry Scopes are always in sync.
 *
 * Note that we currently only support AsyncHooks with this,
 * but since this should work for Node 14+ anyhow that should be good enough.
 */
const SentryContextManager = opentelemetry.wrapContextManagerClass(contextAsyncHooks.AsyncLocalStorageContextManager);

exports.SentryContextManager = SentryContextManager;
//# sourceMappingURL=contextManager.js.map
