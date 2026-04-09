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
import { diag } from '@opentelemetry/api';
import * as api from '@opentelemetry/api';
import { timeInputToHrTime, isAttributeValue, } from '@opentelemetry/core';
export class LogRecord {
    constructor(_sharedState, instrumentationScope, logRecord) {
        this.attributes = {};
        this.totalAttributesCount = 0;
        this._isReadonly = false;
        const { timestamp, observedTimestamp, severityNumber, severityText, body, attributes = {}, context, } = logRecord;
        const now = Date.now();
        this.hrTime = timeInputToHrTime(timestamp !== null && timestamp !== void 0 ? timestamp : now);
        this.hrTimeObserved = timeInputToHrTime(observedTimestamp !== null && observedTimestamp !== void 0 ? observedTimestamp : now);
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
        this.setAttributes(attributes);
    }
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
    get droppedAttributesCount() {
        return this.totalAttributesCount - Object.keys(this.attributes).length;
    }
    setAttribute(key, value) {
        if (this._isLogRecordReadonly()) {
            return this;
        }
        if (value === null) {
            return this;
        }
        if (key.length === 0) {
            api.diag.warn(`Invalid attribute key: ${key}`);
            return this;
        }
        if (!isAttributeValue(value) &&
            !(typeof value === 'object' &&
                !Array.isArray(value) &&
                Object.keys(value).length > 0)) {
            api.diag.warn(`Invalid attribute value set for key: ${key}`);
            return this;
        }
        this.totalAttributesCount += 1;
        if (Object.keys(this.attributes).length >=
            this._logRecordLimits.attributeCountLimit &&
            !Object.prototype.hasOwnProperty.call(this.attributes, key)) {
            // This logic is to create drop message at most once per LogRecord to prevent excessive logging.
            if (this.droppedAttributesCount === 1) {
                api.diag.warn('Dropping extra attributes.');
            }
            return this;
        }
        if (isAttributeValue(value)) {
            this.attributes[key] = this._truncateToSize(value);
        }
        else {
            this.attributes[key] = value;
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
    _truncateToLimitUtil(value, limit) {
        if (value.length <= limit) {
            return value;
        }
        return value.substring(0, limit);
    }
    _isLogRecordReadonly() {
        if (this._isReadonly) {
            diag.warn('Can not execute the operation on emitted log record');
        }
        return this._isReadonly;
    }
}
//# sourceMappingURL=LogRecord.js.map