"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hexTraceId = hexTraceId;
exports.hexSpanId = hexSpanId;
exports.asStr = asStr;
exports.kindName = kindName;
exports.statusName = statusName;
exports.partitionByIdentity = partitionByIdentity;
exports.isAgent365ExporterEnabled = isAgent365ExporterEnabled;
exports.isPerRequestExportEnabled = isPerRequestExportEnabled;
exports.useCustomDomainForObservability = useCustomDomainForObservability;
exports.resolveAgent365Endpoint = resolveAgent365Endpoint;
exports.getAgent365ObservabilityDomainOverride = getAgent365ObservabilityDomainOverride;
exports.parseIdentityKey = parseIdentityKey;
const api_1 = require("@opentelemetry/api");
const constants_1 = require("../constants");
const logging_1 = __importDefault(require("../../utils/logging"));
const ExporterEventNames_1 = require("./ExporterEventNames");
const configuration_1 = require("../../configuration");
const PerRequestProcessorInternalOverrides_1 = require("../../internal/PerRequestProcessorInternalOverrides");
/**
 * Convert trace ID to hex string format
 */
function hexTraceId(value) {
    if (typeof value === 'number') {
        // Convert integer to 32 hex chars (128-bit)
        return value.toString(16).padStart(32, '0');
    }
    // Handle hex string input - ensure it's 32 hex characters
    return value.replace(/^0x/, '').padStart(32, '0');
}
/**
 * Convert span ID to hex string format
 */
function hexSpanId(value) {
    if (typeof value === 'number') {
        // Convert integer to 16 hex chars (64-bit)
        return value.toString(16).padStart(16, '0');
    }
    // Handle hex string input - ensure it's 16 hex characters
    return value.replace(/^0x/, '').padStart(16, '0');
}
/**
 * Convert any value to string, handling null/undefined
 */
function asStr(v) {
    if (v === null || v === undefined) {
        return undefined;
    }
    const s = String(v);
    return s.trim() ? s : undefined;
}
/**
 * Get span kind name from SpanKind enum
 */
function kindName(kind) {
    switch (kind) {
        case api_1.SpanKind.INTERNAL:
            return 'INTERNAL';
        case api_1.SpanKind.SERVER:
            return 'SERVER';
        case api_1.SpanKind.CLIENT:
            return 'CLIENT';
        case api_1.SpanKind.PRODUCER:
            return 'PRODUCER';
        case api_1.SpanKind.CONSUMER:
            return 'CONSUMER';
        default:
            return 'UNSPECIFIED';
    }
}
/**
 * Get status name from SpanStatusCode enum
 */
function statusName(code) {
    switch (code) {
        case api_1.SpanStatusCode.UNSET:
            return 'UNSET';
        case api_1.SpanStatusCode.OK:
            return 'OK';
        case api_1.SpanStatusCode.ERROR:
            return 'ERROR';
        default:
            return 'UNSET';
    }
}
/**
 * Partition spans by (tenantId, agentId) identity pairs
 */
function partitionByIdentity(spans) {
    const groups = new Map();
    let skippedCount = 0;
    for (const span of spans) {
        const attrs = span.attributes || {};
        const tenant = asStr(attrs[constants_1.OpenTelemetryConstants.TENANT_ID_KEY]);
        const agent = asStr(attrs[constants_1.OpenTelemetryConstants.GEN_AI_AGENT_ID_KEY]);
        if (!tenant || !agent) {
            skippedCount++;
            continue;
        }
        const key = `${tenant}:${agent}`;
        const existing = groups.get(key) || [];
        existing.push(span);
        groups.set(key, existing);
    }
    if (skippedCount > 0) {
        logging_1.default.event(ExporterEventNames_1.ExporterEventNames.EXPORT_PARTITION_SPAN_MISSING_IDENTITY, false, 0, `${skippedCount} spans are skipped due to missing tenant or agent ID`);
    }
    logging_1.default.info(`[Agent365Exporter] Partitioned into ${groups.size} identity groups (${skippedCount} spans skipped)`);
    return groups;
}
/**
 * Check if Agent 365 exporter is enabled via environment variable
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
function isAgent365ExporterEnabled(configProvider) {
    const provider = configProvider ?? configuration_1.defaultObservabilityConfigurationProvider;
    const enabled = provider.getConfiguration().isObservabilityExporterEnabled;
    logging_1.default.info(`[Agent365Exporter] Agent 365 exporter enabled: ${enabled}`);
    return enabled;
}
/**
 * Check if per-request export is enabled.
 * Precedence: internal overrides > configuration provider > environment variable.
 * When enabled, the PerRequestSpanProcessor is used instead of BatchSpanProcessor.
 * The token is passed via OTel Context (async local storage) at export time.
 * @param configProvider Optional configuration provider. Defaults to defaultPerRequestSpanProcessorConfigurationProvider if not specified.
 */
function isPerRequestExportEnabled(configProvider) {
    const overrides = (0, PerRequestProcessorInternalOverrides_1.getPerRequestProcessorInternalOverrides)();
    const overrideValue = overrides?.isPerRequestExportEnabled?.();
    if (typeof overrideValue === 'boolean') {
        logging_1.default.info(`[Agent365Exporter] Per-request export enabled (internal override): ${overrideValue}`);
        return overrideValue;
    }
    const provider = configProvider ?? configuration_1.defaultPerRequestSpanProcessorConfigurationProvider;
    const enabled = provider.getConfiguration().isPerRequestExportEnabled;
    logging_1.default.info(`[Agent365Exporter] Per-request export enabled: ${enabled}`);
    return enabled;
}
/**
 * Single toggle to use custom domain for observability export.
 * When true exporter will send traces to custom Agent365 service endpoint
 * and include x-ms-tenant-id in headers.
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
function useCustomDomainForObservability(configProvider) {
    const provider = configProvider ?? configuration_1.defaultObservabilityConfigurationProvider;
    const enabled = provider.getConfiguration().useCustomDomainForObservability;
    logging_1.default.info(`[Agent365Exporter] Use custom domain for observability: ${enabled}`);
    return enabled;
}
/**
 * Resolve the Agent365 service endpoint base URI for a given cluster category.
 * When an explicit override is not configured, this determines the default base URI.
 */
function resolveAgent365Endpoint(clusterCategory) {
    switch (clusterCategory) {
        case 'prod':
        default:
            return 'https://agent365.svc.cloud.microsoft';
    }
}
/**
 * Get Agent365 Observability domain override.
 * Internal development and test clusters can override this by setting the
 * `A365_OBSERVABILITY_DOMAIN_OVERRIDE` environment variable. When set to a
 * non-empty value, that value is used as the base URI regardless of cluster category. Otherwise, null is returned.
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
function getAgent365ObservabilityDomainOverride(configProvider) {
    const provider = configProvider ?? configuration_1.defaultObservabilityConfigurationProvider;
    return provider.getConfiguration().observabilityDomainOverride;
}
/**
 * Parse identity key back to tenant and agent IDs
 */
function parseIdentityKey(key) {
    const [tenantId, agentId] = key.split(':');
    return { tenantId, agentId };
}
//# sourceMappingURL=utils.js.map