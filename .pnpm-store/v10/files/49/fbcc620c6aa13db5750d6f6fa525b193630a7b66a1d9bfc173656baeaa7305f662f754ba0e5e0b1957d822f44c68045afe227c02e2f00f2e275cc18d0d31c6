/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { isSpanContextValid, trace } from '@opentelemetry/api';
class ExemplarBucket {
    value = 0;
    attributes = {};
    timestamp = [0, 0];
    spanId;
    traceId;
    _offered = false;
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
    _reservoirStorage;
    _size;
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