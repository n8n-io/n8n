"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const hdr = require("./index");
describe("Histogram builder", () => {
    it("should build histogram with default values", () => {
        // given
        // when
        const histogram = hdr.build();
        // then
        expect(histogram).not.toBeNull();
        expect(histogram.autoResize).toBe(true);
        expect(histogram.highestTrackableValue).toBe(2);
    });
    it("should build histogram with custom parameters", () => {
        // given
        // when
        const histogram = hdr.build({
            bitBucketSize: 32,
            numberOfSignificantValueDigits: 2,
        });
        const expectedHistogram = new hdr.Int32Histogram(1, 2, 2);
        expectedHistogram.autoResize = true;
        histogram.recordValue(12345);
        expectedHistogram.recordValue(12345);
        // then
        expect(histogram.mean).toBe(expectedHistogram.mean);
    });
});
//# sourceMappingURL=index.spec.js.map