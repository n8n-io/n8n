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
export class ViewRegistry {
    constructor() {
        this._registeredViews = [];
    }
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