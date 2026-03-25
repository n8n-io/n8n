"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const HistogramLogReader_1 = require("./HistogramLogReader");
const wasm_1 = require("./wasm");
const { floor } = Math;
function checkNotNull(actual) {
    expect(actual).not.toBeNull();
}
describe("Histogram Log Reader", () => {
    let fileContent;
    let tagFileContent;
    let fileContentWithBaseTime;
    let fileContentWithoutHeader;
    let fileContentWithTrailingWhitespace;
    beforeAll(() => {
        // when using mutation testing tool stryker, source code
        // is copied in a sandbox directory without the test_files
        // directory...
        const runFromStryker = __dirname.includes("stryker");
        const prefix = runFromStryker ? "../.." : ".";
        fileContent = fs.readFileSync(`${prefix}/test_files/jHiccup-2.0.7S.logV2.hlog`, "UTF-8");
        fileContentWithBaseTime = fs.readFileSync(`${prefix}/test_files/jHiccup-with-basetime-2.0.7S.logV2.hlog`, "UTF-8");
        fileContentWithoutHeader = fs.readFileSync(`${prefix}/test_files/jHiccup-no-header-2.0.7S.logV2.hlog`, "UTF-8");
        tagFileContent = fs.readFileSync(`${prefix}/test_files/tagged-Log.logV2.hlog`, "UTF-8");
        fileContentWithTrailingWhitespace = fs.readFileSync(`${prefix}/test_files/bug-whitespace.hlog`, "UTF-8");
    });
    it("should update startTimeSec reading first histogram", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        reader.nextIntervalHistogram();
        // then
        expect(reader.startTimeSec).toBe(1441812279.474);
    });
    it("should read first histogram starting from the beginning", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        // if mean is good, strong probability everything else is good as well
        expect(floor(histogram.mean)).toBe(301998);
    });
    it("should read encoded histogram and use provided constructor", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent, "packed");
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        // if mean is good, strong probability everything else is good as well
        expect(floor(histogram.mean)).toBe(301998);
    });
    it("should return null if no histogram in the logs", () => {
        // given
        const reader = new HistogramLogReader_1.default("# empty");
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        expect(histogram).toBeNull();
    });
    it("should return next histogram in the logs", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        reader.nextIntervalHistogram();
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        // if mean is good, strong probability everything else is good as well
        expect(floor(histogram.mean)).toBe(293719);
    });
    it("should return null if all histograms are after specified time range", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const histogram = reader.nextIntervalHistogram(0.01, 0.1);
        // then
        expect(histogram).toBeNull();
    });
    it("should return null if all histograms are before specified time range", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const histogram = reader.nextIntervalHistogram(62, 63);
        // then
        expect(histogram).toBeNull();
    });
    it("should parse histogram even if there are trailing whitespaces", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContentWithTrailingWhitespace);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        // no error
    });
    it("should return histograms within specified time range", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const firstHistogram = reader.nextIntervalHistogram(0, 2);
        const secondHistogram = reader.nextIntervalHistogram(0, 2);
        const thirdHistogram = reader.nextIntervalHistogram(0, 2);
        // then
        checkNotNull(firstHistogram);
        checkNotNull(secondHistogram);
        expect(thirdHistogram).toBeNull();
        // if mean is good, strong probability everything else is good as well
        expect(floor(firstHistogram.mean)).toBe(301998);
        expect(floor(secondHistogram.mean)).toBe(293719);
    });
    it("should set start timestamp on histogram", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        expect(histogram.startTimeStampMsec).toBe(1441812279601);
    });
    it("should set end timestamp on histogram", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContent);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        expect(histogram.endTimeStampMsec).toBe(1441812280608);
    });
    it("should parse tagged histogram", () => {
        // given
        const reader = new HistogramLogReader_1.default(tagFileContent);
        reader.nextIntervalHistogram();
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        expect(histogram.tag).toBe("A");
        expect(floor(histogram.mean)).toBe(301998);
    });
    it("should use basetime to set timestamps on histogram", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContentWithBaseTime);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        expect(histogram.startTimeStampMsec).toBe(1441812123250);
        expect(histogram.endTimeStampMsec).toBe(1441812124257);
    });
    it("should default startTime using 1st observed time", () => {
        // given
        const reader = new HistogramLogReader_1.default(fileContentWithoutHeader);
        // when
        const histogram = reader.nextIntervalHistogram();
        // then
        checkNotNull(histogram);
        expect(histogram.startTimeStampMsec).toBe(127);
        expect(histogram.endTimeStampMsec).toBe(1134);
    });
    it("should list all the tags of a log file", () => {
        // given
        // when
        const tags = (0, HistogramLogReader_1.listTags)(tagFileContent);
        // then
        expect(tags).toEqual(["NO TAG", "A"]);
    });
    it("should list all the tags of a log file where all histograms are tagged", () => {
        // given
        const content = `#[Fake log chunk]
#[Histogram log format version 1.2]
#[StartTime: 1441812279.474 (seconds since epoch), Wed Sep 09 08:24:39 PDT 2015]
"StartTimestamp","Interval_Length","Interval_Max","Interval_Compressed_Histogram"
Tag=NOT-EMPTY,0.127,1.007,2.769,HISTFAAAAEV42pNpmSzMwMCgyAABTBDKT4GBgdnNYMcCBvsPEBEJISEuATEZMQ4uASkhIR4nrxg9v2lMaxhvMekILGZkKmcCAEf2CsI=
Tag=A,0.127,1.007,2.769,HISTFAAAAEV42pNpmSzMwMCgyAABTBDKT4GBgdnNYMcCBvsPEBEJISEuATEZMQ4uASkhIR4nrxg9v2lMaxhvMekILGZkKmcCAEf2CsI=
`;
        // when
        const tags = (0, HistogramLogReader_1.listTags)(content);
        // then
        expect(tags).toEqual(["NOT-EMPTY", "A"]);
    });
    describe("with WASM", () => {
        let accumulatedHistogram;
        beforeAll(wasm_1.initWebAssembly);
        afterEach(() => {
            accumulatedHistogram.destroy();
        });
        it("should do the whole 9 yards just like the original Java version :-)", () => {
            // given
            const reader = new HistogramLogReader_1.default(fileContent, 32, true);
            accumulatedHistogram = wasm_1.WasmHistogram.build();
            let histogram;
            let histogramCount = 0;
            let totalCount = 0;
            // when
            while ((histogram = reader.nextIntervalHistogram()) != null) {
                histogramCount++;
                totalCount += histogram.totalCount;
                accumulatedHistogram.add(histogram);
                histogram.destroy();
            }
            // then
            expect(histogramCount).toBe(62);
            expect(totalCount).toBe(48761);
            expect(accumulatedHistogram.getValueAtPercentile(99.9)).toBe(1745879039);
            expect(reader.startTimeSec).toBe(1441812279.474);
        });
    });
});
//# sourceMappingURL=HistogramLogReader.spec.js.map