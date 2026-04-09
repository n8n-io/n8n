/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as api from '@opentelemetry/api';
import { timeInputToHrTime } from '@opentelemetry/core';
import { ATTR_EXCEPTION_MESSAGE, ATTR_EXCEPTION_STACKTRACE, ATTR_EXCEPTION_TYPE, } from '@opentelemetry/semantic-conventions';
import { isLogAttributeValue } from './utils/validation';
export class LogRecordImpl {
    hrTime;
    hrTimeObserved;
    spanContext;
    resource;
    instrumentationScope;
    attributes = {};
    _severityText;
    _severityNumber;
    _body;
    _eventName;
    _attributesCount = 0;
    _droppedAttributesCount = 0;
    _isReadonly = false;
    _logRecordLimits;
    set severityText(severityText) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._severityText = severityText;
    }
    get severityText() {
        return this._severityText;
    }
    set severityNumber(severityNumber) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._severityNumber = severityNumber;
    }
    get severityNumber() {
        return this._severityNumber;
    }
    set body(body) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._body = body;
    }
    get body() {
        return this._body;
    }
    get eventName() {
        return this._eventName;
    }
    set eventName(eventName) {
        if (this._isLogRecordReadonly()) {
            return;
        }
        this._eventName = eventName;
    }
    get droppedAttributesCount() {
        return this._droppedAttributesCount;
    }
    constructor(_sharedState, instrumentationScope, logRecord) {
        const { timestamp, observedTimestamp, eventName, severityNumber, severityText, body, attributes = {}, exception, context, } = logRecord;
        const now = Date.now();
        this.hrTime = timeInputToHrTime(timestamp ?? now);
        this.hrTimeObserved = timeInputToHrTime(observedTimestamp ?? now);
        if (context) {
            const spanContext = api.trace.getSpanContext(context);
            if (spanContext && api.isSpanContextValid(spanContext)) {
                this.spanContext = spanContext;
            }
        }
        this.severityNumber = severityNumber;
        this.severityText = severityText;
        this.body = body;
        this.resource = _sharedState.resource;
        this.instrumentationScope = instrumentationScope;
        this._logRecordLimits = _sharedState.logRecordLimits;
        this._eventName = eventName;
        this.setAttributes(attributes);
        if (exception != null) {
            this._setException(exception);
        }
    }
    setAttribute(key, value) {
        if (this._isLogRecordReadonly()) {
            return this;
        }
        if (key.length === 0) {
            api.diag.warn(`Invalid attribute key: ${key}`);
            return this;
        }
        if (!isLogAttributeValue(value)) {
            api.diag.warn(`Invalid attribute value set for key: ${key}`);
            return this;
        }
        const isNewKey = !Object.prototype.hasOwnProperty.call(this.attributes, key);
        if (isNewKey &&
            this._attributesCount >= this._logRecordLimits.attributeCountLimit) {
            this._droppedAttributesCount++;
            // Only warn once per LogRecord to avoid log spam
            if (this._droppedAttributesCount === 1) {
                api.diag.warn('Dropping extra attributes.');
            }
            return this;
        }
        this.attributes[key] = this._truncateToSize(value);
        if (isNewKey) {
            this._attributesCount++;
        }
        return this;
    }
    setAttributes(attributes) {
        for (const [k, v] of Object.entries(attributes)) {
            this.setAttribute(k, v);
        }
        return this;
    }
    setBody(body) {
        this.body = body;
        return this;
    }
    setEventName(eventName) {
        this.eventName = eventName;
        return this;
    }
    setSeverityNumber(severityNumber) {
        this.severityNumber = severityNumber;
        return this;
    }
    setSeverityText(severityText) {
        this.severityText = severityText;
        return this;
    }
    /**
     * @internal
     * A LogRecordProcessor may freely modify logRecord for the duration of the OnEmit call.
     * If logRecord is needed after OnEmit returns (i.e. for asynchronous processing) only reads are permitted.
     */
    _makeReadonly() {
        this._isReadonly = true;
    }
    _truncateToSize(value) {
        const limit = this._logRecordLimits.attributeValueLengthLimit;
        // Check limit
        if (limit <= 0) {
            // Negative values are invalid, so do not truncate
            api.diag.warn(`Attribute value limit must be positive, got ${limit}`);
            return value;
        }
        // null/undefined - no truncation needed
        if (value == null) {
            return value;
        }
        // String
        if (typeof value === 'string') {
            return this._truncateToLimitUtil(value, limit);
        }
        // Byte arrays - no truncation needed
        if (value instanceof Uint8Array) {
            return value;
        }
        // Arrays (can contain any AnyValue types)
        if (Array.isArray(value)) {
            return value.map(val => this._truncateToSize(val));
        }
        // Objects/Maps - recursively truncate nested values
        if (typeof value === 'object') {
            const truncatedObj = {};
            for (const [k, v] of Object.entries(value)) {
                truncatedObj[k] = this._truncateToSize(v);
            }
            return truncatedObj;
        }
        // Other types (number, boolean), no need to apply value length limit
        return value;
    }
    _setException(exception) {
        let hasMinimumAttributes = false;
        if (typeof exception === 'string' || typeof exception === 'number') {
            if (!Object.hasOwn(this.attributes, ATTR_EXCEPTION_MESSAGE)) {
                this.setAttribute(ATTR_EXCEPTION_MESSAGE, String(exception));
            }
            hasMinimumAttributes = true;
        }
        else if (exception && typeof exception === 'object') {
            const exceptionObj = exception;
            if (exceptionObj.code) {
                if (!Object.hasOwn(this.attributes, ATTR_EXCEPTION_TYPE)) {
                    this.setAttribute(ATTR_EXCEPTION_TYPE, exceptionObj.code.toString());
                }
                hasMinimumAttributes = true;
            }
            else if (exceptionObj.name) {
                if (!Object.hasOwn(this.attributes, ATTR_EXCEPTION_TYPE)) {
                    this.setAttribute(ATTR_EXCEPTION_TYPE, exceptionObj.name);
                }
                hasMinimumAttributes = true;
            }
            if (exceptionObj.message) {
                if (!Object.hasOwn(this.attributes, ATTR_EXCEPTION_MESSAGE)) {
                    this.setAttribute(ATTR_EXCEPTION_MESSAGE, exceptionObj.message);
                }
                hasMinimumAttributes = true;
            }
            if (exceptionObj.stack) {
                if (!Object.hasOwn(this.attributes, ATTR_EXCEPTION_STACKTRACE)) {
                    this.setAttribute(ATTR_EXCEPTION_STACKTRACE, exceptionObj.stack);
                }
                hasMinimumAttributes = true;
            }
        }
        if (!hasMinimumAttributes) {
            api.diag.warn(`Failed to record an exception ${exception}`);
        }
    }
    _truncateToLimitUtil(value, limit) {
        if (value.length <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }
    _isLogRecordReadonly() {
        if (this._isReadonly) {
            api.diag.warn('Can not execute the operation on emitted log record');
        }
        return this._isReadonly;
    }
}
//# sourceMappingURL=LogRecordImpl.js.map