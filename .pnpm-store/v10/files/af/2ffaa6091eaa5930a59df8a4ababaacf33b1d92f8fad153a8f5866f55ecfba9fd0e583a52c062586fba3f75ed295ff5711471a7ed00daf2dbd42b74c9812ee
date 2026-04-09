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
class ExemplarBucket {
    constructor() {
        this.value = 0;
        this.attributes = {};
        this.timestamp = [0, 0];
        this._offered = false;
    }
    offer(value, timestamp, attributes, ctx) {
        this.value = value;
        this.timestamp = timestamp;
        this.attributes = attributes;
        const spanContext = trace.getSpanContext(ctx);
        if (spanContext && isSpanContextValid(spanContext)) {
            this.spanId = spanContext.spanId;
            this.traceId = spanContext.traceId;
        }
        this._offered = true;
    }
    collect(pointAttributes) {
        if (!this._offered)
            return null;
        const currentAttributes = this.attributes;
        // filter attributes
        Object.keys(pointAttributes).forEach(key => {
            if (pointAttributes[key] === currentAttributes[key]) {
                delete currentAttributes[key];
            }
        });
        const retVal = {
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
    }
}
export class FixedSizeExemplarReservoirBase {
    constructor(size) {
        this._size = size;
        this._reservoirStorage = new Array(size);
        for (let i = 0; i < this._size; i++) {
            this._reservoirStorage[i] = new ExemplarBucket();
        }
    }
    maxSize() {
        return this._size;
    }
    /**
     * Resets the reservoir
     */
    reset() { }
    collect(pointAttributes) {
        const exemplars = [];
        this._reservoirStorage.forEach(storageItem => {
            const res = storageItem.collect(pointAttributes);
            if (res !== null) {
                exemplars.push(res);
            }
        });
        this.reset();
        return exemplars;
    }
}
//# sourceMappingURL=ExemplarReservoir.js.map