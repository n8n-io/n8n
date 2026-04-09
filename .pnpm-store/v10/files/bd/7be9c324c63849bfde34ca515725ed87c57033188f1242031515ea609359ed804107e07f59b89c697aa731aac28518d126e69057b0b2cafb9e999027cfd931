"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricStorage = void 0;
const InstrumentDescriptor_1 = require("../InstrumentDescriptor");
/**
 * Internal interface.
 *
 * Represents a storage from which we can collect metrics.
 */
class MetricStorage {
    _instrumentDescriptor;
    constructor(instrumentDescriptor) {
        this._instrumentDescriptor = instrumentDescriptor;
    }
    getInstrumentDescriptor() {
        return this._instrumentDescriptor;
    }
    updateDescription(description) {
        this._instrumentDescriptor = (0, InstrumentDescriptor_1.createInstrumentDescriptor)(this._instrumentDescriptor.name, this._instrumentDescriptor.type, {
            description: description,
            valueType: this._instrumentDescriptor.valueType,
            unit: this._instrumentDescriptor.unit,
            advice: this._instrumentDescriptor.advice,
        });
    }
}
exports.MetricStorage = MetricStorage;
//# sourceMappingURL=MetricStorage.js.map