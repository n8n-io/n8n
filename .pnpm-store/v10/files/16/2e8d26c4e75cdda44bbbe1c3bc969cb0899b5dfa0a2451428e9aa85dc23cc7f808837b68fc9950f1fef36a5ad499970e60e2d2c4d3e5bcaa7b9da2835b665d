// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------------------------
import { ExportResultCode } from '@opentelemetry/core';
import { PowerPlatformApiDiscovery } from '@microsoft/agents-a365-runtime';
import { partitionByIdentity, parseIdentityKey, hexTraceId, hexSpanId, kindName, statusName, useCustomDomainForObservability, resolveAgent365Endpoint, getAgent365ObservabilityDomainOverride, isPerRequestExportEnabled } from './utils';
import { getExportToken } from '../context/token-context';
import logger, { formatError } from '../../utils/logging';
import { ExporterEventNames } from './ExporterEventNames';
const DEFAULT_HTTP_TIMEOUT_SECONDS = 30000; // 30 seconds in ms
const DEFAULT_MAX_RETRIES = 3;
/**
 * Observability span exporter for Agent365:
 * - Partitions spans by (tenantId, agentId)
 * - Builds OTLP-like JSON: resourceSpans -> scopeSpans -> spans
 * - POSTs per group to https://{endpoint}/maven/agent365/agents/{agentId}/traces?api-version=1
 *   or, when useS2SEndpoint is true, https://{endpoint}/maven/agent365/service/agents/{agentId}/traces?api-version=1
 * - Adds Bearer token via token_resolver(agentId, tenantId)
 */
export class Agent365Exporter {
    /**
     * Initialize exporter with a fully constructed options instance.
     * @param options Exporter options controlling batching, timeouts, token acquisition and endpoint shape.
     * @param configProvider Optional configuration provider. When supplied, the exporter uses it for
     *        configuration lookups (custom domain, domain override) instead of the default env-based provider.
     */
    constructor(options, configProvider) {
        this.closed = false;
        if (!options) {
            throw new Error('Agent365ExporterOptions must be provided (was null/undefined)');
        }
        if (!isPerRequestExportEnabled() && !options.tokenResolver) {
            throw new Error('Agent365Exporter tokenResolver must be provided for batch export');
        }
        this.options = options;
        this.configProvider = configProvider;
    }
    /**
     * Export spans to Agent365 service
     */
    async export(spans, resultCallback) {
        if (this.closed) {
            resultCallback({ code: ExportResultCode.FAILED });
            return;
        }
        const startTime = Date.now();
        try {
            logger.info(`[Agent365Exporter] Exporting ${spans.length} spans`);
            const groups = partitionByIdentity(spans);
            if (groups.size === 0) {
                logger.info('[Agent365Exporter] No groups to export');
                resultCallback({ code: ExportResultCode.SUCCESS });
                return;
            }
            logger.info(`[Agent365Exporter] Exporting ${groups.size} identity groups`);
            let anyFailure = false;
            const promises = [];
            for (const [identityKey, activities] of groups) {
                const promise = this.exportGroup(identityKey, activities).catch((err) => {
                    anyFailure = true;
                    logger.error(`[Agent365Exporter] Error exporting group ${identityKey}: ${formatError(err)}`);
                });
                promises.push(promise);
            }
            await Promise.all(promises);
            const duration = Date.now() - startTime;
            const success = !anyFailure;
            const message = success ? 'All spans exported successfully' : 'Not all spans exported successfully';
            logger.event(ExporterEventNames.EXPORT, success, duration, message);
            resultCallback({
                code: success ? ExportResultCode.SUCCESS : ExportResultCode.FAILED
            });
        }
        catch (_error) {
            // Exporters should not raise; signal failure
            const duration = Date.now() - startTime;
            logger.event(ExporterEventNames.EXPORT, false, duration, `Export failed with error: ${formatError(_error)}`);
            resultCallback({ code: ExportResultCode.FAILED });
        }
    }
    /**
     * Export a group of spans for a specific identity
     */
    async exportGroup(identityKey, spans) {
        const { tenantId, agentId } = parseIdentityKey(identityKey);
        logger.info(`[Agent365Exporter] Exporting ${spans.length} spans for tenantId: ${tenantId}, agentId: ${agentId}`);
        const startTime = Date.now();
        const payload = this.buildExportRequest(spans);
        const body = JSON.stringify(payload);
        const usingCustomServiceEndpoint = useCustomDomainForObservability(this.configProvider);
        // Select endpoint path based on S2S flag
        const endpointRelativePath = this.options.useS2SEndpoint
            ? `/maven/agent365/service/agents/${agentId}/traces`
            : `/maven/agent365/agents/${agentId}/traces`;
        let url;
        const domainOverride = getAgent365ObservabilityDomainOverride(this.configProvider);
        if (domainOverride) {
            url = `${domainOverride}${endpointRelativePath}?api-version=1`;
        }
        else if (usingCustomServiceEndpoint) {
            const base = resolveAgent365Endpoint(this.options.clusterCategory);
            url = `${base}${endpointRelativePath}?api-version=1`;
            logger.info(`[Agent365Exporter] Using custom domain endpoint: ${url}`);
        }
        else {
            // Default behavior: discover PPAPI gateway endpoint per-tenant
            const discovery = new PowerPlatformApiDiscovery(this.options.clusterCategory);
            const endpoint = discovery.getTenantIslandClusterEndpoint(tenantId);
            url = `https://${endpoint}${endpointRelativePath}?api-version=1`;
            logger.info(`[Agent365Exporter] Resolved endpoint: ${url}`);
        }
        const headers = {
            'content-type': 'application/json'
        };
        let token = null;
        let tokenNotResolvedReason = null;
        if (isPerRequestExportEnabled()) {
            // For per-request export, get token from OTel Context
            token = getExportToken() ?? null;
            if (!token) {
                tokenNotResolvedReason = 'No token available in OTel Context for per-request export';
            }
        }
        else {
            // For batch export, use tokenResolver
            if (!this.options.tokenResolver) {
                tokenNotResolvedReason = 'tokenResolver is undefined';
            }
            else {
                const tokenResult = this.options.tokenResolver(agentId, tenantId);
                token = tokenResult instanceof Promise ? await tokenResult : tokenResult;
                if (token) {
                    logger.info('[Agent365Exporter] Token resolved successfully via tokenResolver');
                }
                else {
                    tokenNotResolvedReason = 'No token resolved via tokenResolver';
                }
            }
        }
        if (token) {
            headers['authorization'] = `Bearer ${token}`;
        }
        else {
            const skipReason = tokenNotResolvedReason || 'Token not resolved for export request';
            logger.event(ExporterEventNames.EXPORT_GROUP, false, 0, `skip exporting: ${skipReason}`, { tenantId, agentId });
            return;
        }
        // Add tenant id to headers when using custom domain
        if (usingCustomServiceEndpoint) {
            headers['x-ms-tenant-id'] = tenantId;
        }
        // Basic retry loop
        const { ok, correlationId } = await this.postWithRetries(url, body, headers);
        const duration = Date.now() - startTime;
        if (!ok) {
            logger.event(ExporterEventNames.EXPORT_GROUP, false, duration, undefined, { tenantId, agentId, correlationId });
            throw new Error('Failed to export spans');
        }
        logger.event(ExporterEventNames.EXPORT_GROUP, true, duration, 'Spans exported successfully', { tenantId, agentId, correlationId });
    }
    /**
     * HTTP POST with retry logic
     */
    async postWithRetries(url, body, headers) {
        let lastCorrelationId = 'unknown';
        for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
            let correlationId;
            try {
                logger.info(`[Agent365Exporter] Posting OTLP export request - Attempt ${attempt + 1}`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body,
                    signal: AbortSignal.timeout(DEFAULT_HTTP_TIMEOUT_SECONDS)
                });
                correlationId = response?.headers?.get('x-ms-correlation-id') || response?.headers?.get('x-correlation-id') || 'unknown';
                lastCorrelationId = correlationId;
                // 2xx => success
                if (response.status >= 200 && response.status < 300) {
                    return { ok: true, correlationId };
                }
                // Retry transient errors
                if ([408, 429].includes(response.status) || (response.status >= 500 && response.status < 600)) {
                    if (attempt < DEFAULT_MAX_RETRIES) {
                        const sleepMs = 200 * (attempt + 1);
                        logger.warn(`[Agent365Exporter] Transient error ${response.status}, correlation ID: ${correlationId}, retrying after ${sleepMs}ms`);
                        await this.sleep(sleepMs);
                        continue;
                    }
                }
                logger.error(`[Agent365Exporter] Failed with status ${response.status}, correlation ID: ${correlationId}`);
                return { ok: false, correlationId };
            }
            catch (error) {
                logger.error('[Agent365Exporter] Request error:', formatError(error));
                if (attempt < DEFAULT_MAX_RETRIES) {
                    const sleepMs = 200 * (attempt + 1);
                    logger.info(`[Agent365Exporter] Retrying after ${sleepMs}ms`);
                    await this.sleep(sleepMs);
                    continue;
                }
                return { ok: false, correlationId: lastCorrelationId };
            }
        }
        return { ok: false, correlationId: lastCorrelationId };
    }
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Build OTLP export request payload
     */
    buildExportRequest(spans) {
        // Group by instrumentation scope (name, version)
        const scopeMap = new Map();
        logger.info('[Agent365Exporter] Building OTLP export request payload');
        for (const sp of spans) {
            const scope = sp.instrumentationScope || sp.instrumentationLibrary;
            const scopeKey = `${scope?.name || 'unknown'}:${scope?.version || ''}`;
            const existing = scopeMap.get(scopeKey) || [];
            existing.push(this.mapSpan(sp));
            scopeMap.set(scopeKey, existing);
        }
        const scopeSpans = [];
        for (const [scopeKey, mappedSpans] of scopeMap) {
            const [name, version] = scopeKey.split(':');
            scopeSpans.push({
                scope: {
                    name,
                    version: version || undefined,
                },
                spans: mappedSpans,
            });
        }
        // Resource attributes (from the first span - all spans in a batch usually share resource)
        let resourceAttrs = {};
        if (spans.length > 0) {
            const firstSpanResource = spans[0].resource?.attributes;
            if (firstSpanResource) {
                resourceAttrs = { ...firstSpanResource };
            }
        }
        return {
            resourceSpans: [
                {
                    resource: { attributes: Object.keys(resourceAttrs).length > 0 ? resourceAttrs : null },
                    scopeSpans,
                }
            ]
        };
    }
    /**
     * Map a ReadableSpan to OTLP span format
     */
    mapSpan(sp) {
        const spanContext = sp.spanContext();
        // Extract parent span ID - check multiple possible sources
        let parentSpanIdHex = undefined;
        const parentContext = sp.parentSpanContext;
        if (parentContext?.spanId && parentContext.spanId !== '0000000000000000') {
            parentSpanIdHex = hexSpanId(parentContext.spanId);
        }
        // attributes
        const attrs = sp.attributes ? { ...sp.attributes } : {};
        // events
        const events = [];
        for (const ev of sp.events || []) {
            // Handle both hrtime arrays and direct nanosecond timestamps
            let timeNs;
            if (Array.isArray(ev.time)) {
                timeNs = ev.time[0] * 1000000000 + ev.time[1];
            }
            else {
                timeNs = ev.time;
            }
            const evAttrs = ev.attributes && Object.keys(ev.attributes).length > 0 ? { ...ev.attributes } : null;
            events.push({
                timeUnixNano: timeNs,
                name: ev.name,
                attributes: evAttrs,
            });
        }
        // links
        const links = [];
        for (const ln of sp.links || []) {
            const lnAttrs = ln.attributes && Object.keys(ln.attributes).length > 0 ? { ...ln.attributes } : null;
            links.push({
                traceId: hexTraceId(ln.context.traceId),
                spanId: hexSpanId(ln.context.spanId),
                attributes: lnAttrs,
            });
        }
        // status
        const statusCode = sp.status?.code ?? 0; // Default to UNSET (0) if no status
        const status = {
            code: statusName(statusCode),
            message: sp.status?.message || '',
        };
        // Convert hrtime to nanoseconds - handle both hrtime arrays and direct nanosecond values
        let startTimeNs;
        let endTimeNs;
        if (Array.isArray(sp.startTime)) {
            // hrtime format [seconds, nanoseconds]
            startTimeNs = sp.startTime[0] * 1000000000 + sp.startTime[1];
        }
        else {
            // Direct nanosecond value
            startTimeNs = sp.startTime;
        }
        if (Array.isArray(sp.endTime)) {
            // hrtime format [seconds, nanoseconds]
            endTimeNs = sp.endTime[0] * 1000000000 + sp.endTime[1];
        }
        else {
            // Direct nanosecond value
            endTimeNs = sp.endTime;
        }
        return {
            traceId: hexTraceId(spanContext.traceId),
            spanId: hexSpanId(spanContext.spanId),
            parentSpanId: parentSpanIdHex,
            name: sp.name,
            kind: kindName(sp.kind),
            startTimeUnixNano: startTimeNs,
            endTimeUnixNano: endTimeNs,
            attributes: Object.keys(attrs).length > 0 ? attrs : null,
            events: events.length > 0 ? events : null,
            links: links.length > 0 ? links : null,
            status,
        };
    }
    /**
     * Shutdown the exporter
     */
    async shutdown() {
        logger.info('[Agent365Exporter] Shutting down exporter');
        this.closed = true;
    }
    /**
     * Force flush any pending spans
     */
    async forceFlush() {
        // No-op for this implementation
        return Promise.resolve();
    }
}
//# sourceMappingURL=Agent365Exporter.js.map