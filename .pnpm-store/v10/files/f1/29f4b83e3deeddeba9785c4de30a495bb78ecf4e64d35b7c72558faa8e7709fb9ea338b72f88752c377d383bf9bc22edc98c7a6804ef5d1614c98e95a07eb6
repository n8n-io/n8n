"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------------------------
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerRequestSpanProcessor = void 0;
const api_1 = require("@opentelemetry/api");
const logging_1 = __importDefault(require("../utils/logging"));
const configuration_1 = require("../configuration");
function isRootSpan(span) {
    return !span.parentSpanContext;
}
/**
 * Buffers spans per trace and exports once the request completes.
 * Token is not stored; we export under the saved request Context so that getExportToken()
 * can read the token from the active OpenTelemetry Context at export time.
 */
class PerRequestSpanProcessor {
    /**
     * Construct a PerRequestSpanProcessor.
     * @param exporter The span exporter to use.
     * @param configProvider Optional configuration provider. Defaults to defaultPerRequestSpanProcessorConfigurationProvider if not specified.
     */
    constructor(exporter, configProvider) {
        this.exporter = exporter;
        this.traces = new Map();
        this.isSweeping = false;
        this.inFlightExports = 0;
        this.exportWaiters = [];
        const effectiveConfigProvider = configProvider ?? configuration_1.defaultPerRequestSpanProcessorConfigurationProvider;
        const config = effectiveConfigProvider.getConfiguration();
        this.maxBufferedTraces = config.perRequestMaxTraces;
        this.maxSpansPerTrace = config.perRequestMaxSpansPerTrace;
        this.maxConcurrentExports = config.perRequestMaxConcurrentExports;
        this.flushGraceMs = config.perRequestFlushGraceMs;
        this.maxTraceAgeMs = config.perRequestMaxTraceAgeMs;
    }
    onStart(span, ctx) {
        const traceId = span.spanContext().traceId;
        let buf = this.traces.get(traceId);
        if (!buf) {
            if (this.traces.size >= this.maxBufferedTraces) {
                logging_1.default.warn(`[PerRequestSpanProcessor] Dropping new trace due to maxBufferedTraces=${this.maxBufferedTraces} traceId=${traceId}`);
                return;
            }
            buf = {
                spans: [],
                openCount: 0,
                rootEnded: false,
                rootCtx: undefined,
                startedAtMs: Date.now(),
                droppedSpans: 0,
            };
            this.traces.set(traceId, buf);
            this.ensureSweepTimer();
            logging_1.default.info(`[PerRequestSpanProcessor] Trace started traceId=${traceId} maxTraceAgeMs=${this.maxTraceAgeMs}`);
        }
        buf.openCount += 1;
        // Debug lifecycle: span started
        logging_1.default.info(`[PerRequestSpanProcessor] Span start name=${span.name} traceId=${traceId} spanId=${span.spanContext().spanId}` +
            ` root=${isRootSpan(span)} openCount=${buf.openCount}`);
        // Capture a context to export under.
        // - Use the first seen context as a fallback.
        // - If/when the root span starts, prefer its context (contains token via ALS).
        if (isRootSpan(span)) {
            buf.rootCtx = ctx;
        }
        else {
            buf.rootCtx ?? (buf.rootCtx = ctx);
        }
    }
    onEnd(span) {
        const traceId = span.spanContext().traceId;
        const buf = this.traces.get(traceId);
        if (!buf)
            return;
        if (buf.spans.length >= this.maxSpansPerTrace) {
            buf.droppedSpans += 1;
            if (buf.droppedSpans === 1 || buf.droppedSpans % 100 === 0) {
                logging_1.default.warn(`[PerRequestSpanProcessor] Dropping ended span due to maxSpansPerTrace=${this.maxSpansPerTrace} ` +
                    `traceId=${traceId} droppedSpans=${buf.droppedSpans}`);
            }
        }
        else {
            buf.spans.push(span);
        }
        buf.openCount -= 1;
        if (buf.openCount < 0) {
            logging_1.default.warn(`[PerRequestSpanProcessor] openCount underflow traceId=${traceId} spanId=${span.spanContext().spanId} resettingToZero`);
            buf.openCount = 0;
        }
        // Debug lifecycle: span ended
        logging_1.default.info(`[PerRequestSpanProcessor] Span end name=${span.name} traceId=${traceId} spanId=${span.spanContext().spanId}` +
            ` root=${isRootSpan(span)} openCount=${buf.openCount} rootEnded=${buf.rootEnded}`);
        if (isRootSpan(span)) {
            buf.rootEnded = true;
            buf.rootEndedAtMs = Date.now();
            if (buf.openCount === 0) {
                // Trace completed: root ended and no open spans remain.
                this.flushTrace(traceId, 'trace_completed');
            }
        }
        else if (buf.rootEnded && buf.openCount === 0) {
            // Common case: root ends first, then children finish shortly after.
            // Flush immediately when the last child ends instead of waiting for grace/max timers.
            this.flushTrace(traceId, 'trace_completed');
        }
    }
    async forceFlush() {
        await Promise.all([...this.traces.keys()].map((id) => this.flushTrace(id, 'force_flush')));
    }
    async shutdown() {
        await this.forceFlush();
        this.stopSweepTimerIfIdle();
        await this.exporter.shutdown?.();
    }
    ensureSweepTimer() {
        if (this.sweepTimer)
            return;
        // Keep one lightweight sweeper. Interval is derived from grace/max-age to keep responsiveness reasonable.
        const intervalMs = Math.max(10, Math.min(this.flushGraceMs, 250));
        this.sweepTimer = setInterval(() => {
            void this.sweep();
        }, intervalMs);
        this.sweepTimer.unref?.();
    }
    stopSweepTimerIfIdle() {
        if (this.traces.size !== 0)
            return;
        if (!this.sweepTimer)
            return;
        clearInterval(this.sweepTimer);
        this.sweepTimer = undefined;
    }
    async sweep() {
        if (this.isSweeping)
            return;
        this.isSweeping = true;
        try {
            if (this.traces.size === 0) {
                this.stopSweepTimerIfIdle();
                return;
            }
            const now = Date.now();
            const toFlush = [];
            for (const [traceId, trace] of this.traces.entries()) {
                // 1) Max age safety flush (clears buffers even if spans never end)
                if (now - trace.startedAtMs >= this.maxTraceAgeMs) {
                    toFlush.push({ traceId, reason: 'max_trace_age' });
                    continue;
                }
                // 2) Root ended grace window flush (clears buffers if children never end)
                if (trace.rootEnded && trace.openCount > 0 && trace.rootEndedAtMs) {
                    if (now - trace.rootEndedAtMs >= this.flushGraceMs) {
                        toFlush.push({ traceId, reason: 'root_ended_grace' });
                    }
                }
            }
            // Flush in parallel; flushTrace removes entries eagerly.
            await Promise.all(toFlush.map((x) => this.flushTrace(x.traceId, x.reason)));
            this.stopSweepTimerIfIdle();
        }
        finally {
            this.isSweeping = false;
        }
    }
    async flushTrace(traceId, reason) {
        const trace = this.traces.get(traceId);
        if (!trace)
            return;
        this.traces.delete(traceId);
        this.stopSweepTimerIfIdle();
        const spans = trace.spans;
        if (spans.length === 0)
            return;
        logging_1.default.info(`[PerRequestSpanProcessor] Flushing trace traceId=${traceId} reason=${reason} spans=${spans.length} rootEnded=${trace.rootEnded}`);
        // Must have captured the root context to access the token
        if (!trace.rootCtx) {
            logging_1.default.error(`[PerRequestSpanProcessor] Missing rootCtx for trace ${traceId}, cannot export spans`);
            return;
        }
        await this.acquireExportSlot();
        try {
            // Export under the original request Context so exporter can read the token from context.active()
            await new Promise((resolve) => {
                try {
                    api_1.context.with(trace.rootCtx, () => {
                        try {
                            this.exporter.export(spans, (result) => {
                                // Log export failures but still resolve to avoid blocking processor
                                if (result.code !== 0) {
                                    logging_1.default.error(`[PerRequestSpanProcessor] Export failed traceId=${traceId} reason=${reason} code=${result.code}`, result.error);
                                }
                                else {
                                    logging_1.default.info(`[PerRequestSpanProcessor] Export succeeded traceId=${traceId} reason=${reason} spans=${spans.length}`);
                                }
                                resolve();
                            });
                        }
                        catch (err) {
                            logging_1.default.error(`[PerRequestSpanProcessor] Export threw traceId=${traceId} reason=${reason} spans=${spans.length}`, err);
                            resolve();
                        }
                    });
                }
                catch (err) {
                    logging_1.default.error(`[PerRequestSpanProcessor] context.with threw traceId=${traceId} reason=${reason}`, err);
                    resolve();
                }
            });
        }
        finally {
            this.releaseExportSlot();
        }
    }
    async acquireExportSlot() {
        if (this.maxConcurrentExports <= 0)
            return;
        if (this.inFlightExports < this.maxConcurrentExports) {
            this.inFlightExports += 1;
            return;
        }
        await new Promise((resolve) => {
            this.exportWaiters.push(() => {
                this.inFlightExports += 1;
                resolve();
            });
        });
    }
    releaseExportSlot() {
        if (this.maxConcurrentExports <= 0)
            return;
        this.inFlightExports = Math.max(0, this.inFlightExports - 1);
        const next = this.exportWaiters.shift();
        if (next)
            next();
    }
}
exports.PerRequestSpanProcessor = PerRequestSpanProcessor;
//# sourceMappingURL=PerRequestSpanProcessor.js.map