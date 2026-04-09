"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropAggregator = void 0;
const types_1 = require("./types");
/** Basic aggregator for None which keeps no recorded value. */
class DropAggregator {
    kind = types_1.AggregatorKind.DROP;
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
exports.DropAggregator = DropAggregator;
//# sourceMappingURL=Drop.js.map