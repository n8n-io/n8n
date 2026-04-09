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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
import { instrumentationScopeId } from '../utils';
import { ViewRegistry } from '../view/ViewRegistry';
import { MeterSharedState } from './MeterSharedState';
/**
 * An internal record for shared meter provider states.
 */
var MeterProviderSharedState = /** @class */ (function () {
    function MeterProviderSharedState(resource) {
        this.resource = resource;
        this.viewRegistry = new ViewRegistry();
        this.metricCollectors = [];
        this.meterSharedStates = new Map();
    }
    MeterProviderSharedState.prototype.getMeterSharedState = function (instrumentationScope) {
        var id = instrumentationScopeId(instrumentationScope);
        var meterSharedState = this.meterSharedStates.get(id);
        if (meterSharedState == null) {
            meterSharedState = new MeterSharedState(this, instrumentationScope);
            this.meterSharedStates.set(id, meterSharedState);
        }
        return meterSharedState;
    };
    MeterProviderSharedState.prototype.selectAggregations = function (instrumentType) {
        var e_1, _a;
        var result = [];
        try {
            for (var _b = __values(this.metricCollectors), _c = _b.next(); !_c.done; _c = _b.next()) {
                var collector = _c.value;
                result.push([collector, collector.selectAggregation(instrumentType)]);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return result;
    };
    return MeterProviderSharedState;
}());
export { MeterProviderSharedState };
//# sourceMappingURL=MeterProviderSharedState.js.map