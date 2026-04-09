"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracer = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const Span_1 = require("./Span");
const utility_1 = require("./utility");
const platform_1 = require("./platform");
/**
 * This class represents a basic tracer.
 */
class Tracer {
    /**
     * Constructs a new Tracer instance.
     */
    constructor(instrumentationLibrary, config, _tracerProvider) {
        this._tracerProvider = _tracerProvider;
        const localConfig = (0, utility_1.mergeConfig)(config);
        this._sampler = localConfig.sampler;
        this._generalLimits = localConfig.generalLimits;
        this._spanLimits = localConfig.spanLimits;
        this._idGenerator = config.idGenerator || new platform_1.RandomIdGenerator();
        this.resource = _tracerProvider.resource;
        this.instrumentationLibrary = instrumentationLibrary;
    }
    /**
     * Starts a new Span or returns the default NoopSpan based on the sampling
     * decision.
     */
    startSpan(name, options = {}, context = api.context.active()) {
        var _a, _b, _c;
        // remove span from context in case a root span is requested via options
        if (options.root) {
            context = api.trace.deleteSpan(context);
        }
        const parentSpan = api.trace.getSpan(context);
        if ((0, core_1.isTracingSuppressed)(context)) {
            api.diag.debug('Instrumentation suppressed, returning Noop Span');
            const nonRecordingSpan = api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
            return nonRecordingSpan;
        }
        const parentSpanContext = parentSpan === null || parentSpan === void 0 ? void 0 : parentSpan.spanContext();
        const spanId = this._idGenerator.generateSpanId();
        let traceId;
        let traceState;
        let parentSpanId;
        if (!parentSpanContext ||
            !api.trace.isSpanContextValid(parentSpanContext)) {
            // New root span.
            traceId = this._idGenerator.generateTraceId();
        }
        else {
            // New child span.
            traceId = parentSpanContext.traceId;
            traceState = parentSpanContext.traceState;
            parentSpanId = parentSpanContext.spanId;
        }
        const spanKind = (_a = options.kind) !== null && _a !== void 0 ? _a : api.SpanKind.INTERNAL;
        const links = ((_b = options.links) !== null && _b !== void 0 ? _b : []).map(link => {
            return {
                context: link.context,
                attributes: (0, core_1.sanitizeAttributes)(link.attributes),
            };
        });
        const attributes = (0, core_1.sanitizeAttributes)(options.attributes);
        // make sampling decision
        const samplingResult = this._sampler.shouldSample(context, traceId, name, spanKind, attributes, links);
        traceState = (_c = samplingResult.traceState) !== null && _c !== void 0 ? _c : traceState;
        const traceFlags = samplingResult.decision === api.SamplingDecision.RECORD_AND_SAMPLED
            ? api.TraceFlags.SAMPLED
            : api.TraceFlags.NONE;
        const spanContext = { traceId, spanId, traceFlags, traceState };
        if (samplingResult.decision === api.SamplingDecision.NOT_RECORD) {
            api.diag.debug('Recording is off, propagating context in a non-recording span');
            const nonRecordingSpan = api.trace.wrapSpanContext(spanContext);
            return nonRecordingSpan;
        }
        // Set initial span attributes. The attributes object may have been mutated
        // by the sampler, so we sanitize the merged attributes before setting them.
        const initAttributes = (0, core_1.sanitizeAttributes)(Object.assign(attributes, samplingResult.attributes));
        const span = new Span_1.Span(this, context, name, spanContext, spanKind, parentSpanId, links, options.startTime, undefined, initAttributes);
        return span;
    }
    startActiveSpan(name, arg2, arg3, arg4) {
        let opts;
        let ctx;
        let fn;
        if (arguments.length < 2) {
            return;
        }
        else if (arguments.length === 2) {
            fn = arg2;
        }
        else if (arguments.length === 3) {
            opts = arg2;
            fn = arg3;
        }
        else {
            opts = arg2;
            ctx = arg3;
            fn = arg4;
        }
        const parentContext = ctx !== null && ctx !== void 0 ? ctx : api.context.active();
        const span = this.startSpan(name, opts, parentContext);
        const contextWithSpanSet = api.trace.setSpan(parentContext, span);
        return api.context.with(contextWithSpanSet, fn, undefined, span);
    }
    /** Returns the active {@link GeneralLimits}. */
    getGeneralLimits() {
        return this._generalLimits;
    }
    /** Returns the active {@link SpanLimits}. */
    getSpanLimits() {
        return this._spanLimits;
    }
    getActiveSpanProcessor() {
        return this._tracerProvider.getActiveSpanProcessor();
    }
}
exports.Tracer = Tracer;
//# sourceMappingURL=Tracer.js.map