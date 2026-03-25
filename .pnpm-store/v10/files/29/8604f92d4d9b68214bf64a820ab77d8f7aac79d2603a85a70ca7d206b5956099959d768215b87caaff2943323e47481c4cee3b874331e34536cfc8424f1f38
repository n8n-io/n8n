import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
/**
 * This is a custom ContextManager for OpenTelemetry, which extends the default AsyncLocalStorageContextManager.
 * It ensures that we create a new hub per context, so that the OTEL Context & the Sentry Scopes are always in sync.
 *
 * Note that we currently only support AsyncHooks with this,
 * but since this should work for Node 14+ anyhow that should be good enough.
 */
export declare const SentryContextManager: new (...args: unknown[]) => AsyncLocalStorageContextManager & {
    getAsyncLocalStorageLookup(): import("@sentry/opentelemetry").AsyncLocalStorageLookup;
};
//# sourceMappingURL=contextManager.d.ts.map