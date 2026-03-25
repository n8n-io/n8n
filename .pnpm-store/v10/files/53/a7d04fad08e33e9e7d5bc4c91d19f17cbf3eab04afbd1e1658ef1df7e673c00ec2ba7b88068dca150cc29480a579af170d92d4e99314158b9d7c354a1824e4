"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeterProviderSharedState = void 0;
const utils_1 = require("../utils");
const ViewRegistry_1 = require("../view/ViewRegistry");
const MeterSharedState_1 = require("./MeterSharedState");
const AggregationOption_1 = require("../view/AggregationOption");
/**
 * An internal record for shared meter provider states.
 */
class MeterProviderSharedState {
    resource;
    viewRegistry = new ViewRegistry_1.ViewRegistry();
    metricCollectors = [];
    meterSharedStates = new Map();
    constructor(resource) {
        this.resource = resource;
    }
    getMeterSharedState(instrumentationScope) {
        const id = (0, utils_1.instrumentationScopeId)(instrumentationScope);
        let meterSharedState = this.meterSharedStates.get(id);
        if (meterSharedState == null) {
            meterSharedState = new MeterSharedState_1.MeterSharedState(this, instrumentationScope);
            this.meterSharedStates.set(id, meterSharedState);
        }
        return meterSharedState;
    }
    selectAggregations(instrumentType) {
        const result = [];
        for (const collector of this.metricCollectors) {
            result.push([
                collector,
                (0, AggregationOption_1.toAggregation)(collector.selectAggregation(instrumentType)),
            ]);
        }
        return result;
    }
}
exports.MeterProviderSharedState = MeterProviderSharedState;
//# sourceMappingURL=MeterProviderSharedState.js.map