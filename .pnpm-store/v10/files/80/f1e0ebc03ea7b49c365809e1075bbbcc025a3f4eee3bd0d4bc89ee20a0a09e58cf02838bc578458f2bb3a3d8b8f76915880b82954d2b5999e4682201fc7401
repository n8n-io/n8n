"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PackedHistogram_1 = require("./PackedHistogram");
describe("Packed histogram", () => {
    it("should compute median value in first bucket", () => {
        // given
        const histogram = new PackedHistogram_1.default(1, Number.MAX_SAFE_INTEGER, 3);
        histogram.recordValue(123456);
        histogram.recordValue(127);
        histogram.recordValue(42);
        // when
        const medianValue = histogram.getValueAtPercentile(50);
        // then
        expect(medianValue).toBe(127);
    });
    it("should compute same values when new or reseted", () => {
        // given
        const histogram = new PackedHistogram_1.default(1, 2, 3);
        const histogram2 = new PackedHistogram_1.default(1, 2, 3);
        histogram.autoResize = true;
        histogram2.autoResize = true;
        [1, 49026].forEach((v) => histogram.recordValue(v));
        // when
        histogram.reset();
        [7, 67, 42357, 805017].forEach((v) => {
            histogram.recordValue(v);
            histogram2.recordValue(v);
        });
        // then
        expect(histogram.getValueAtPercentile(5)).toBe(histogram2.getValueAtPercentile(5));
    });
    it("should compute value outside first bucket with an error less than 1000", () => {
        // given
        const histogram = new PackedHistogram_1.default(1, 123456, 2);
        histogram.recordValue(5234);
        histogram.recordValue(127);
        histogram.recordValue(42);
        // when
        const percentileValue = histogram.getValueAtPercentile(90);
        // then
        expect(Math.abs(percentileValue - 5234)).toBeLessThan(100);
    });
    it("should resize underlying packed array when recording an out of bound value", () => {
        // given
        const histogram = new PackedHistogram_1.default(1, 2, 3);
        histogram.autoResize = true;
        // when
        histogram.recordValue(123456);
        // then
        expect(histogram.totalCount).toBe(1);
    });
});
describe("Histogram clearing support", () => {
    it("should reset data in order to reuse histogram", () => {
        // given
        const histogram = new PackedHistogram_1.default(1, Number.MAX_SAFE_INTEGER, 2);
        const histogram2 = new PackedHistogram_1.default(1, Number.MAX_SAFE_INTEGER, 2);
        histogram.startTimeStampMsec = 42;
        histogram.endTimeStampMsec = 56;
        histogram.tag = "blabla";
        histogram.recordValue(10);
        histogram.recordValue(1000);
        histogram.recordValue(10000000);
        // when
        histogram.reset();
        // then
        expect(histogram.totalCount).toBe(0);
        expect(histogram.startTimeStampMsec).toBe(0);
        expect(histogram.endTimeStampMsec).toBe(0);
        //expect(histogram.tag).toBe(NO_TAG);
        expect(histogram.maxValue).toBe(0);
        expect(histogram.minNonZeroValue).toBe(Number.MAX_SAFE_INTEGER);
        expect(histogram.getValueAtPercentile(99.999)).toBe(0);
    });
});
//# sourceMappingURL=PackedHistogram.spec.js.map