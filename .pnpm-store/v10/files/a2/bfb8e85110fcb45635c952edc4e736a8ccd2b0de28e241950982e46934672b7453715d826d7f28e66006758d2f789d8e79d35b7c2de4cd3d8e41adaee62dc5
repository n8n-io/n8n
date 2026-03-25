"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerRequestSpanProcessorConfiguration = void 0;
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
const PerRequestProcessorInternalOverrides_1 = require("../internal/PerRequestProcessorInternalOverrides");
/** Guardrails to prevent unbounded memory growth / export bursts. Used for PerRequestSpanProcessor only. */
const DEFAULT_MAX_BUFFERED_TRACES = 1000;
const DEFAULT_MAX_SPANS_PER_TRACE = 5000;
const DEFAULT_MAX_CONCURRENT_EXPORTS = 20;
const DEFAULT_FLUSH_GRACE_MS = 250;
const DEFAULT_MAX_TRACE_AGE_MS = 30 * 60 * 1000; // 30 minutes
/**
 * Configuration for PerRequestSpanProcessor.
 * Inherits runtime settings (clusterCategory, isNodeEnvDevelopment) and adds
 * per-request processor guardrails.
 *
 * This is separated from ObservabilityConfiguration because PerRequestSpanProcessor
 * is used only in specific scenarios and these settings should not be exposed
 * in the common ObservabilityConfiguration.
 */
class PerRequestSpanProcessorConfiguration extends agents_a365_runtime_1.RuntimeConfiguration {
    get perRequestOverrides() {
        const internal = (0, PerRequestProcessorInternalOverrides_1.getPerRequestProcessorInternalOverrides)();
        const instanceOverrides = this.overrides;
        return {
            ...(instanceOverrides ?? {}),
            ...(internal?.isPerRequestExportEnabled !== undefined && { isPerRequestExportEnabled: internal.isPerRequestExportEnabled }),
            ...(internal?.perRequestMaxTraces !== undefined && { perRequestMaxTraces: internal.perRequestMaxTraces }),
            ...(internal?.perRequestMaxSpansPerTrace !== undefined && { perRequestMaxSpansPerTrace: internal.perRequestMaxSpansPerTrace }),
            ...(internal?.perRequestMaxConcurrentExports !== undefined && { perRequestMaxConcurrentExports: internal.perRequestMaxConcurrentExports }),
            ...(internal?.perRequestFlushGraceMs !== undefined && { perRequestFlushGraceMs: internal.perRequestFlushGraceMs }),
            ...(internal?.perRequestMaxTraceAgeMs !== undefined && { perRequestMaxTraceAgeMs: internal.perRequestMaxTraceAgeMs }),
        };
    }
    constructor(overrides) {
        super(overrides);
    }
    get isPerRequestExportEnabled() {
        const result = this.perRequestOverrides.isPerRequestExportEnabled?.();
        if (result !== undefined)
            return result;
        return agents_a365_runtime_1.RuntimeConfiguration.parseEnvBoolean(process.env.ENABLE_A365_OBSERVABILITY_PER_REQUEST_EXPORT);
    }
    get perRequestMaxTraces() {
        const value = this.perRequestOverrides.perRequestMaxTraces?.()
            ?? agents_a365_runtime_1.RuntimeConfiguration.parseEnvInt(process.env.A365_PER_REQUEST_MAX_TRACES, DEFAULT_MAX_BUFFERED_TRACES);
        return value > 0 ? value : DEFAULT_MAX_BUFFERED_TRACES;
    }
    get perRequestMaxSpansPerTrace() {
        const value = this.perRequestOverrides.perRequestMaxSpansPerTrace?.()
            ?? agents_a365_runtime_1.RuntimeConfiguration.parseEnvInt(process.env.A365_PER_REQUEST_MAX_SPANS_PER_TRACE, DEFAULT_MAX_SPANS_PER_TRACE);
        return value > 0 ? value : DEFAULT_MAX_SPANS_PER_TRACE;
    }
    get perRequestMaxConcurrentExports() {
        const value = this.perRequestOverrides.perRequestMaxConcurrentExports?.()
            ?? agents_a365_runtime_1.RuntimeConfiguration.parseEnvInt(process.env.A365_PER_REQUEST_MAX_CONCURRENT_EXPORTS, DEFAULT_MAX_CONCURRENT_EXPORTS);
        return value > 0 ? value : DEFAULT_MAX_CONCURRENT_EXPORTS;
    }
    get perRequestFlushGraceMs() {
        const value = this.perRequestOverrides.perRequestFlushGraceMs?.()
            ?? agents_a365_runtime_1.RuntimeConfiguration.parseEnvInt(process.env.A365_PER_REQUEST_FLUSH_GRACE_MS, DEFAULT_FLUSH_GRACE_MS);
        return value > 0 ? value : DEFAULT_FLUSH_GRACE_MS;
    }
    get perRequestMaxTraceAgeMs() {
        const value = this.perRequestOverrides.perRequestMaxTraceAgeMs?.()
            ?? agents_a365_runtime_1.RuntimeConfiguration.parseEnvInt(process.env.A365_PER_REQUEST_MAX_TRACE_AGE_MS, DEFAULT_MAX_TRACE_AGE_MS);
        return value > 0 ? value : DEFAULT_MAX_TRACE_AGE_MS;
    }
}
exports.PerRequestSpanProcessorConfiguration = PerRequestSpanProcessorConfiguration;
//# sourceMappingURL=PerRequestSpanProcessorConfiguration.js.map