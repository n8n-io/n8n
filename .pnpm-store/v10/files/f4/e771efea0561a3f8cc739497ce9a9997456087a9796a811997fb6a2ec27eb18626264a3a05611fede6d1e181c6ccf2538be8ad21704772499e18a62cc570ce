"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
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
    viewRegistry = new ViewRegistry_1.ViewRegistry();
    metricCollectors = [];
    meterSharedStates = new Map();
    resource;
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