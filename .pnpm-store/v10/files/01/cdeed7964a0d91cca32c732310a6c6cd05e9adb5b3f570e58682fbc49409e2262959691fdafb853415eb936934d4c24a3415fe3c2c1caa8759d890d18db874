"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fc = require("fast-check");
const ByteBuffer_1 = require("./ByteBuffer");
const ZigZagEncoding_1 = require("./ZigZagEncoding");
const runFromStryker = __dirname.includes("stryker");
const runnerOptions = {
    numRuns: runFromStryker ? 10 : 1000,
};
describe("Zig Zag Encoding", () => {
    it("should get the same number after an encoding & decoding", () => {
        const buffer = ByteBuffer_1.default.allocate(8);
        fc.assert(fc.property(fc.nat(Number.MAX_SAFE_INTEGER), (number) => {
            buffer.resetPosition();
            ZigZagEncoding_1.default.encode(buffer, number);
            buffer.resetPosition();
            const result = ZigZagEncoding_1.default.decode(buffer);
            return number === result;
        }), runnerOptions);
    });
});
//# sourceMappingURL=ZigZagEncoding.fc.spec.js.map