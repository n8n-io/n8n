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
import { isSpanContextValid, trace, } from '@opentelemetry/api';
var ExemplarBucket = /** @class */ (function () {
    function ExemplarBucket() {
        this.value = 0;
        this.attributes = {};
        this.timestamp = [0, 0];
        this._offered = false;
    }
    ExemplarBucket.prototype.offer = function (value, timestamp, attributes, ctx) {
        this.value = value;
        this.timestamp = timestamp;
        this.attributes = attributes;
        var spanContext = trace.getSpanContext(ctx);
        if (spanContext && isSpanContextValid(spanContext)) {
            this.spanId = spanContext.spanId;
            this.traceId = spanContext.traceId;
        }
        this._offered = true;
    };
    ExemplarBucket.prototype.collect = function (pointAttributes) {
        if (!this._offered)
            return null;
        var currentAttributes = this.attributes;
        // filter attributes
        Object.keys(pointAttributes).forEach(function (key) {
            if (pointAttributes[key] === currentAttributes[key]) {
                delete currentAttributes[key];
            }
        });
        var retVal = {
            filteredAttributes: currentAttributes,
            value: this.value,
            timestamp: this.timestamp,
            spanId: this.spanId,
            traceId: this.traceId,
        };
        this.attributes = {};
        this.value = 0;
        this.timestamp = [0, 0];
        this.spanId = undefined;
        this.traceId = undefined;
        this._offered = false;
        return retVal;
    };
    return ExemplarBucket;
}());
var FixedSizeExemplarReservoirBase = /** @class */ (function () {
    function FixedSizeExemplarReservoirBase(size) {
        this._size = size;
        this._reservoirStorage = new Array(size);
        for (var i = 0; i < this._size; i++) {
            this._reservoirStorage[i] = new ExemplarBucket();
        }
    }
    FixedSizeExemplarReservoirBase.prototype.maxSize = function () {
        return this._size;
    };
    /**
     * Resets the reservoir
     */
    FixedSizeExemplarReservoirBase.prototype.reset = function () { };
    FixedSizeExemplarReservoirBase.prototype.collect = function (pointAttributes) {
        var exemplars = [];
        this._reservoirStorage.forEach(function (storageItem) {
            var res = storageItem.collect(pointAttributes);
            if (res !== null) {
                exemplars.push(res);
            }
        });
        this.reset();
        return exemplars;
    };
    return FixedSizeExemplarReservoirBase;
}());
export { FixedSizeExemplarReservoirBase };
//# sourceMappingURL=ExemplarReservoir.js.map