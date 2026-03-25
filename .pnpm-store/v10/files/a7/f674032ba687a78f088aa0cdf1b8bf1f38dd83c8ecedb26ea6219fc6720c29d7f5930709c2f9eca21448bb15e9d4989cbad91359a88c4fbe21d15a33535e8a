"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
describe("Logs", () => {
    it("should give same result after been written then read", () => {
        // given
        let buffer = "";
        const writer = new _1.HistogramLogWriter((content) => {
            buffer += content;
        });
        writer.outputLogFormatVersion();
        writer.outputStartTime(12345000);
        writer.outputLegend();
        const inputHistogram = (0, _1.build)();
        inputHistogram.recordValue(42);
        // when
        writer.outputIntervalHistogram(inputHistogram, 12345042, 1234056, 1);
        const reader = new _1.HistogramLogReader(buffer);
        const outputHistogram = reader.nextIntervalHistogram();
        // then
        expect(outputHistogram).not.toBeNull();
        // @ts-ignore
        expect(outputHistogram.mean).toBe(inputHistogram.mean);
    });
});
//# sourceMappingURL=log.spec.js.map