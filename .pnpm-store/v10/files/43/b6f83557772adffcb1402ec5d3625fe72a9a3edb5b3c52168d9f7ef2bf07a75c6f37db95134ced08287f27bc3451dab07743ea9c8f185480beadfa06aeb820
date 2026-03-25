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
exports.SpanImpl = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const enums_1 = require("./enums");
/**
 * This class represents a span.
 */
class SpanImpl {
    // Below properties are included to implement ReadableSpan for export
    // purposes but are not intended to be written-to directly.
    _spanContext;
    kind;
    parentSpanContext;
    attributes = {};
    links = [];
    events = [];
    startTime;
    resource;
    instrumentationScope;
    _droppedAttributesCount = 0;
    _droppedEventsCount = 0;
    _droppedLinksCount = 0;
    name;
    status = {
        code: api_1.SpanStatusCode.UNSET,
    };
    endTime = [0, 0];
    _ended = false;
    _duration = [-1, -1];
    _spanProcessor;
    _spanLimits;
    _attributeValueLengthLimit;
    _performanceStartTime;
    _performanceOffset;
    _startTimeProvided;
    /**
     * Constructs a new SpanImpl instance.
     */
    constructor(opts) {
        const now = Date.now();
        this._spanContext = opts.spanContext;
        this._performanceStartTime = core_1.otperformance.now();
        this._performanceOffset =
            now - (this._performanceStartTime + (0, core_1.getTimeOrigin)());
        this._startTimeProvided = opts.startTime != null;
        this._spanLimits = opts.spanLimits;
        this._attributeValueLengthLimit =
            this._spanLimits.attributeValueLengthLimit || 0;
        this._spanProcessor = opts.spanProcessor;
        this.name = opts.name;
        this.parentSpanContext = opts.parentSpanContext;
        this.kind = opts.kind;
        this.links = opts.links || [];
        this.startTime = this._getTime(opts.startTime ?? now);
        this.resource = opts.resource;
        this.instrumentationScope = opts.scope;
        if (opts.attributes != null) {
            this.setAttributes(opts.attributes);
        }
        this._spanProcessor.onStart(this, opts.context);
    }
    spanContext() {
        return this._spanContext;
    }
    setAttribute(key, value) {
        if (value == null || this._isSpanEnded())
            return this;
        if (key.length === 0) {
            api_1.diag.warn(`Invalid attribute key: ${key}`);
            return this;
        }
        if (!(0, core_1.isAttributeValue)(value)) {
            api_1.diag.warn(`Invalid attribute value set for key: ${key}`);
            return this;
        }
        const { attributeCountLimit } = this._spanLimits;
        if (attributeCountLimit !== undefined &&
            Object.keys(this.attributes).length >= attributeCountLimit &&
            !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
            this._droppedAttributesCount++;
            return this;
        }
        this.attributes[key] = this._truncateToSize(value);
        return this;
    }
    setAttributes(attributes) {
        for (const [k, v] of Object.entries(attributes)) {
            this.setAttribute(k, v);
        }
        return this;
    }
    /**
     *
     * @param name Span Name
     * @param [attributesOrStartTime] Span attributes or start time
     *     if type is {@type TimeInput} and 3rd param is undefined
     * @param [timeStamp] Specified time stamp for the event
     */
    addEvent(name, attributesOrStartTime, timeStamp) {
        if (this._isSpanEnded())
            return this;
        const { eventCountLimit } = this._spanLimits;
        if (eventCountLimit === 0) {
            api_1.diag.warn('No events allowed.');
            this._droppedEventsCount++;
            return this;
        }
        if (eventCountLimit !== undefined &&
            this.events.length >= eventCountLimit) {
            if (this._droppedEventsCount === 0) {
                api_1.diag.debug('Dropping extra events.');
            }
            this.events.shift();
            this._droppedEventsCount++;
        }
        if ((0, core_1.isTimeInput)(attributesOrStartTime)) {
            if (!(0, core_1.isTimeInput)(timeStamp)) {
                timeStamp = attributesOrStartTime;
            }
            attributesOrStartTime = undefined;
        }
        const attributes = (0, core_1.sanitizeAttributes)(attributesOrStartTime);
        this.events.push({
            name,
            attributes,
            time: this._getTime(timeStamp),
            droppedAttributesCount: 0,
        });
        return this;
    }
    addLink(link) {
        this.links.push(link);
        return this;
    }
    addLinks(links) {
        this.links.push(...links);
        return this;
    }
    setStatus(status) {
        if (this._isSpanEnded())
            return this;
        this.status = { ...status };
        // When using try-catch, the caught "error" is of type `any`. When then assigning `any` to `status.message`,
        // TypeScript will not error. While this can happen during use of any API, it is more common on Span#setStatus()
        // as it's likely used in a catch-block. Therefore, we validate if `status.message` is actually a string, null, or
        // undefined to avoid an incorrect type causing issues downstream.
        if (this.status.message != null && typeof status.message !== 'string') {
            api_1.diag.warn(`Dropping invalid status.message of type '${typeof status.message}', expected 'string'`);
            delete this.status.message;
        }
        return this;
    }
    updateName(name) {
        if (this._isSpanEnded())
            return this;
        this.name = name;
        return this;
    }
    end(endTime) {
        if (this._isSpanEnded()) {
            api_1.diag.error(`${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`);
            return;
        }
        this._ended = true;
        this.endTime = this._getTime(endTime);
        this._duration = (0, core_1.hrTimeDuration)(this.startTime, this.endTime);
        if (this._duration[0] < 0) {
            api_1.diag.warn('Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.', this.startTime, this.endTime);
            this.endTime = this.startTime.slice();
            this._duration = [0, 0];
        }
        if (this._droppedEventsCount > 0) {
            api_1.diag.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
        }
        this._spanProcessor.onEnd(this);
    }
    _getTime(inp) {
        if (typeof inp === 'number' && inp <= core_1.otperformance.now()) {
            // must be a performance timestamp
            // apply correction and convert to hrtime
            return (0, core_1.hrTime)(inp + this._performanceOffset);
        }
        if (typeof inp === 'number') {
            return (0, core_1.millisToHrTime)(inp);
        }
        if (inp instanceof Date) {
            return (0, core_1.millisToHrTime)(inp.getTime());
        }
        if ((0, core_1.isTimeInputHrTime)(inp)) {
            return inp;
        }
        if (this._startTimeProvided) {
            // if user provided a time for the start manually
            // we can't use duration to calculate event/end times
            return (0, core_1.millisToHrTime)(Date.now());
        }
        const msDuration = core_1.otperformance.now() - this._performanceStartTime;
        return (0, core_1.addHrTimes)(this.startTime, (0, core_1.millisToHrTime)(msDuration));
    }
    isRecording() {
        return this._ended === false;
    }
    recordException(exception, time) {
        const attributes = {};
        if (typeof exception === 'string') {
            attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE] = exception;
        }
        else if (exception) {
            if (exception.code) {
                attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] = exception.code.toString();
            }
            else if (exception.name) {
                attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] = exception.name;
            }
            if (exception.message) {
                attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE] = exception.message;
            }
            if (exception.stack) {
                attributes[semantic_conventions_1.ATTR_EXCEPTION_STACKTRACE] = exception.stack;
            }
        }
        // these are minimum requirements from spec
        if (attributes[semantic_conventions_1.ATTR_EXCEPTION_TYPE] || attributes[semantic_conventions_1.ATTR_EXCEPTION_MESSAGE]) {
            this.addEvent(enums_1.ExceptionEventName, attributes, time);
        }
        else {
            api_1.diag.warn(`Failed to record an exception ${exception}`);
        }
    }
    get duration() {
        return this._duration;
    }
    get ended() {
        return this._ended;
    }
    get droppedAttributesCount() {
        return this._droppedAttributesCount;
    }
    get droppedEventsCount() {
        return this._droppedEventsCount;
    }
    get droppedLinksCount() {
        return this._droppedLinksCount;
    }
    _isSpanEnded() {
        if (this._ended) {
            const error = new Error(`Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`);
            api_1.diag.warn(`Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`, error);
        }
        return this._ended;
    }
    // Utility function to truncate given value within size
    // for value type of string, will truncate to given limit
    // for type of non-string, will return same value
    _truncateToLimitUtil(value, limit) {
        if (value.length <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }
    /**
     * If the given attribute value is of type string and has more characters than given {@code attributeValueLengthLimit} then
     * return string with truncated to {@code attributeValueLengthLimit} characters
     *
     * If the given attribute value is array of strings then
     * return new array of strings with each element truncated to {@code attributeValueLengthLimit} characters
     *
     * Otherwise return same Attribute {@code value}
     *
     * @param value Attribute value
     * @returns truncated attribute value if required, otherwise same value
     */
    _truncateToSize(value) {
        const limit = this._attributeValueLengthLimit;
        // Check limit
        if (limit <= 0) {
            // Negative values are invalid, so do not truncate
            api_1.diag.warn(`Attribute value limit must be positive, got ${limit}`);
            return value;
        }
        // String
        if (typeof value === 'string') {
            return this._truncateToLimitUtil(value, limit);
        }
        // Array of strings
        if (Array.isArray(value)) {
            return value.map(val => typeof val === 'string' ? this._truncateToLimitUtil(val, limit) : val);
        }
        // Other types, no need to apply value length limit
        return value;
    }
}
exports.SpanImpl = SpanImpl;
//# sourceMappingURL=Span.js.map