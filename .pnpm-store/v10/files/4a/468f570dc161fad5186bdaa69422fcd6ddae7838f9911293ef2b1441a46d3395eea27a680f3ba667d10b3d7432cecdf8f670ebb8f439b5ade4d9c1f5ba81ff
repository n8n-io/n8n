/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { AggregatorKind } from './types';
/** Basic aggregator for None which keeps no recorded value. */
export class DropAggregator {
    kind = AggregatorKind.DROP;
    createAccumulation() {
        return undefined;
    }
    merge(_previous, _delta) {
        return undefined;
    }
    diff(_previous, _current) {
        return undefined;
    }
    toMetricData(_descriptor, _aggregationTemporality, _accumulationByAttributes, _endTime) {
        return undefined;
    }
}
//# sourceMappingURL=Drop.js.map