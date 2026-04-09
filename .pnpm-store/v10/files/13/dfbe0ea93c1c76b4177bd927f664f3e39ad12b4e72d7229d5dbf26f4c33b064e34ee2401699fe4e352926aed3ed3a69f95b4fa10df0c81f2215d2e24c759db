"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPointType = exports.InstrumentType = void 0;
/**
 * Supported types of metric instruments.
 */
var InstrumentType;
(function (InstrumentType) {
    InstrumentType["COUNTER"] = "COUNTER";
    InstrumentType["GAUGE"] = "GAUGE";
    InstrumentType["HISTOGRAM"] = "HISTOGRAM";
    InstrumentType["UP_DOWN_COUNTER"] = "UP_DOWN_COUNTER";
    InstrumentType["OBSERVABLE_COUNTER"] = "OBSERVABLE_COUNTER";
    InstrumentType["OBSERVABLE_GAUGE"] = "OBSERVABLE_GAUGE";
    InstrumentType["OBSERVABLE_UP_DOWN_COUNTER"] = "OBSERVABLE_UP_DOWN_COUNTER";
})(InstrumentType = exports.InstrumentType || (exports.InstrumentType = {}));
/**
 * The aggregated point data type.
 */
var DataPointType;
(function (DataPointType) {
    /**
     * A histogram data point contains a histogram statistics of collected
     * values with a list of explicit bucket boundaries and statistics such
     * as min, max, count, and sum of all collected values.
     */
    DataPointType[DataPointType["HISTOGRAM"] = 0] = "HISTOGRAM";
    /**
     * An exponential histogram data point contains a histogram statistics of
     * collected values where bucket boundaries are automatically calculated
     * using an exponential function, and statistics such as min, max, count,
     * and sum of all collected values.
     */
    DataPointType[DataPointType["EXPONENTIAL_HISTOGRAM"] = 1] = "EXPONENTIAL_HISTOGRAM";
    /**
     * A gauge metric data point has only a single numeric value.
     */
    DataPointType[DataPointType["GAUGE"] = 2] = "GAUGE";
    /**
     * A sum metric data point has a single numeric value and a
     * monotonicity-indicator.
     */
    DataPointType[DataPointType["SUM"] = 3] = "SUM";
})(DataPointType = exports.DataPointType || (exports.DataPointType = {}));
//# sourceMappingURL=MetricData.js.map