/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { instrumentationScopeId } from '../utils';
import { ViewRegistry } from '../view/ViewRegistry';
import { MeterSharedState } from './MeterSharedState';
import { toAggregation } from '../view/AggregationOption';
/**
 * An internal record for shared meter provider states.
 */
export class MeterProviderSharedState {
    viewRegistry = new ViewRegistry();
    metricCollectors = [];
    meterSharedStates = new Map();
    resource;
    constructor(resource) {
        this.resource = resource;
    }
    getMeterSharedState(instrumentationScope) {
        const id = instrumentationScopeId(instrumentationScope);
        let meterSharedState = this.meterSharedStates.get(id);
        if (meterSharedState == null) {
            meterSharedState = new MeterSharedState(this, instrumentationScope);
            this.meterSharedStates.set(id, meterSharedState);
        }
        return meterSharedState;
    }
    selectAggregations(instrumentType) {
        const result = [];
        for (const collector of this.metricCollectors) {
            result.push([
                collector,
                toAggregation(collector.selectAggregation(instrumentType)),
            ]);
        }
        return result;
    }
}
//# sourceMappingURL=MeterProviderSharedState.js.map