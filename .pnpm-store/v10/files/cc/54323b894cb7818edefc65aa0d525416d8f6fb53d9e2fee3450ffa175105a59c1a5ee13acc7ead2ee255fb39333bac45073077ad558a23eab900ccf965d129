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
import * as api from '@opentelemetry/api';
import { sanitizeAttributes, isTracingSuppressed, } from '@opentelemetry/core';
import { Span } from './Span';
import { mergeConfig } from './utility';
import { RandomIdGenerator } from './platform';
/**
 * This class represents a basic tracer.
 */
var Tracer = /** @class */ (function () {
    /**
     * Constructs a new Tracer instance.
     */
    function Tracer(instrumentationLibrary, config, _tracerProvider) {
        this._tracerProvider = _tracerProvider;
        var localConfig = mergeConfig(config);
        this._sampler = localConfig.sampler;
        this._generalLimits = localConfig.generalLimits;
        this._spanLimits = localConfig.spanLimits;
        this._idGenerator = config.idGenerator || new RandomIdGenerator();
        this.resource = _tracerProvider.resource;
        this.instrumentationLibrary = instrumentationLibrary;
    }
    /**
     * Starts a new Span or returns the default NoopSpan based on the sampling
     * decision.
     */
    Tracer.prototype.startSpan = function (name, options, context) {
        var _a, _b, _c;
        if (options === void 0) { options = {}; }
        if (context === void 0) { context = api.context.active(); }
        // remove span from context in case a root span is requested via options
        if (options.root) {
            context = api.trace.deleteSpan(context);
        }
        var parentSpan = api.trace.getSpan(context);
        if (isTracingSuppressed(context)) {
            api.diag.debug('Instrumentation suppressed, returning Noop Span');
            var nonRecordingSpan = api.trace.wrapSpanContext(api.INVALID_SPAN_CONTEXT);
            return nonRecordingSpan;
        }
        var parentSpanContext = parentSpan === null || parentSpan === void 0 ? void 0 : parentSpan.spanContext();
        var spanId = this._idGenerator.generateSpanId();
        var traceId;
        var traceState;
        var parentSpanId;
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
        var spanKind = (_a = options.kind) !== null && _a !== void 0 ? _a : api.SpanKind.INTERNAL;
        var links = ((_b = options.links) !== null && _b !== void 0 ? _b : []).map(function (link) {
            return {
                context: link.context,
                attributes: sanitizeAttributes(link.attributes),
            };
        });
        var attributes = sanitizeAttributes(options.attributes);
        // make sampling decision
        var samplingResult = this._sampler.shouldSample(context, traceId, name, spanKind, attributes, links);
        traceState = (_c = samplingResult.traceState) !== null && _c !== void 0 ? _c : traceState;
        var traceFlags = samplingResult.decision === api.SamplingDecision.RECORD_AND_SAMPLED
            ? api.TraceFlags.SAMPLED
            : api.TraceFlags.NONE;
        var spanContext = { traceId: traceId, spanId: spanId, traceFlags: traceFlags, traceState: traceState };
        if (samplingResult.decision === api.SamplingDecision.NOT_RECORD) {
            api.diag.debug('Recording is off, propagating context in a non-recording span');
            var nonRecordingSpan = api.trace.wrapSpanContext(spanContext);
            return nonRecordingSpan;
        }
        // Set initial span attributes. The attributes object may have been mutated
        // by the sampler, so we sanitize the merged attributes before setting them.
        var initAttributes = sanitizeAttributes(Object.assign(attributes, samplingResult.attributes));
        var span = new Span(this, context, name, spanContext, spanKind, parentSpanId, links, options.startTime, undefined, initAttributes);
        return span;
    };
    Tracer.prototype.startActiveSpan = function (name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
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
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : api.context.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = api.trace.setSpan(parentContext, span);
        return api.context.with(contextWithSpanSet, fn, undefined, span);
    };
    /** Returns the active {@link GeneralLimits}. */
    Tracer.prototype.getGeneralLimits = function () {
        return this._generalLimits;
    };
    /** Returns the active {@link SpanLimits}. */
    Tracer.prototype.getSpanLimits = function () {
        return this._spanLimits;
    };
    Tracer.prototype.getActiveSpanProcessor = function () {
        return this._tracerProvider.getActiveSpanProcessor();
    };
    return Tracer;
}());
export { Tracer };
//# sourceMappingURL=Tracer.js.map