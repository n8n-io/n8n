"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HistogramLogWriter_1 = require("./HistogramLogWriter");
const Int32Histogram_1 = require("./Int32Histogram");
describe("Histogram Log Writer", () => {
    let buffer;
    let writer;
    let histogram;
    beforeEach(() => {
        buffer = "";
        writer = new HistogramLogWriter_1.default((content) => {
            buffer += content;
        });
        histogram = new Int32Histogram_1.default(1, Number.MAX_SAFE_INTEGER, 3);
    });
    it("should write a line with start time, duration, max value, and a base64 encoded histogram", () => {
        // given
        histogram.recordValue(123000);
        // when
        writer.outputIntervalHistogram(histogram, 1000, 1042);
        // then
        expect(buffer).toMatch(/^1000.000,42.000,123.000,HISTFAA/);
    });
    it("should write start time, duration and  max value using 3 digits", () => {
        // given
        histogram.recordValue(123001);
        // when
        writer.outputIntervalHistogram(histogram, 1000.0120001, 1042.013001);
        // then
        expect(buffer).toMatch(/^1000.012,42.001,123.001,HISTFAA/);
    });
    it("should write a line starting with histogram tag", () => {
        // given
        histogram.tag = "TAG";
        histogram.recordValue(123000);
        // when
        writer.outputIntervalHistogram(histogram, 1000, 1042);
        // then
        expect(buffer).toContain("Tag=TAG,1000.000,42.000,123.000,HISTFAA");
    });
    it("should write a histogram's start time in sec using basetime", () => {
        // given
        histogram.startTimeStampMsec = 1234001;
        histogram.endTimeStampMsec = 1235001;
        writer.baseTime = 1000000;
        histogram.recordValue(1);
        // when
        writer.outputIntervalHistogram(histogram);
        // then
        expect(buffer).toContain("234.001");
    });
    it("should write start time in seconds", () => {
        // given
        // when
        writer.outputStartTime(1234560);
        // then
        expect(buffer).toContain("1234.560");
    });
});
//# sourceMappingURL=HistogramLogWriter.spec.js.map