"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewRegistry = void 0;
class ViewRegistry {
    _registeredViews = [];
    addView(view) {
        this._registeredViews.push(view);
    }
    findViews(instrument, meter) {
        const views = this._registeredViews.filter(registeredView => {
            return (this._matchInstrument(registeredView.instrumentSelector, instrument) &&
                this._matchMeter(registeredView.meterSelector, meter));
        });
        return views;
    }
    _matchInstrument(selector, instrument) {
        return ((selector.getType() === undefined ||
            instrument.type === selector.getType()) &&
            selector.getNameFilter().match(instrument.name) &&
            selector.getUnitFilter().match(instrument.unit));
    }
    _matchMeter(selector, meter) {
        return (selector.getNameFilter().match(meter.name) &&
            (meter.version === undefined ||
                selector.getVersionFilter().match(meter.version)) &&
            (meter.schemaUrl === undefined ||
                selector.getSchemaUrlFilter().match(meter.schemaUrl)));
    }
}
exports.ViewRegistry = ViewRegistry;
//# sourceMappingURL=ViewRegistry.js.map