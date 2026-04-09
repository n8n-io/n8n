/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { createInstrumentDescriptor } from '../InstrumentDescriptor';
/**
 * Internal interface.
 *
 * Represents a storage from which we can collect metrics.
 */
export class MetricStorage {
    _instrumentDescriptor;
    constructor(instrumentDescriptor) {
        this._instrumentDescriptor = instrumentDescriptor;
    }
    getInstrumentDescriptor() {
        return this._instrumentDescriptor;
    }
    updateDescription(description) {
        this._instrumentDescriptor = createInstrumentDescriptor(this._instrumentDescriptor.name, this._instrumentDescriptor.type, {
            description: description,
            valueType: this._instrumentDescriptor.valueType,
            unit: this._instrumentDescriptor.unit,
            advice: this._instrumentDescriptor.advice,
        });
    }
}
//# sourceMappingURL=MetricStorage.js.map