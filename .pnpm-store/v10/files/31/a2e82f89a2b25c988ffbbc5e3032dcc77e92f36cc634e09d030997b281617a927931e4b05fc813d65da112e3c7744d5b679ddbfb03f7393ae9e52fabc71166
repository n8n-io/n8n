"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSummary = exports.NO_TAG = void 0;
const formatters_1 = require("./formatters");
exports.NO_TAG = "NO TAG";
const toSummary = (histogram) => {
    const { totalCount, maxValue, numberOfSignificantValueDigits } = histogram;
    const round = (0, formatters_1.keepSignificantDigits)(numberOfSignificantValueDigits);
    return {
        p50: round(histogram.getValueAtPercentile(50)),
        p75: round(histogram.getValueAtPercentile(75)),
        p90: round(histogram.getValueAtPercentile(90)),
        p97_5: round(histogram.getValueAtPercentile(97.5)),
        p99: round(histogram.getValueAtPercentile(99)),
        p99_9: round(histogram.getValueAtPercentile(99.9)),
        p99_99: round(histogram.getValueAtPercentile(99.99)),
        p99_999: round(histogram.getValueAtPercentile(99.999)),
        max: maxValue,
        totalCount,
    };
};
exports.toSummary = toSummary;
//# sourceMappingURL=Histogram.js.map