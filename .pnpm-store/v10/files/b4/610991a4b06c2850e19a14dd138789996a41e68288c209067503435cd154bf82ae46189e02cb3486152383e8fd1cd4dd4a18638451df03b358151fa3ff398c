/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
export class ViewRegistry {
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
//# sourceMappingURL=ViewRegistry.js.map