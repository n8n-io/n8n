"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ByteBuffer_1 = require("./ByteBuffer");
const ZigZagEncoding_1 = require("./ZigZagEncoding");
describe("Zig Zag Encoding", () => {
    it("should encode int using one byte when value is less than 64", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(4);
        // when
        ZigZagEncoding_1.default.encode(buffer, 56);
        // then
        expect(buffer.data).toHaveLength(4);
        expect(buffer.data[0]).toBe(112);
    });
    it("should encode int using several bytes when value is more than 64", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(4);
        // when
        ZigZagEncoding_1.default.encode(buffer, 456);
        // then
        expect(buffer.data).toHaveLength(4);
        expect(Array.from(buffer.data)).toEqual([144, 7, 0, 0]);
    });
    it("should encode negative int using several bytes when value is more than 64", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(4);
        // when
        ZigZagEncoding_1.default.encode(buffer, -456);
        // then
        expect(buffer.data).toHaveLength(4);
        expect(Array.from(buffer.data)).toEqual([143, 7, 0, 0]);
    });
    it("should encode large safe int greater than 2^32", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(4);
        // when
        ZigZagEncoding_1.default.encode(buffer, Math.pow(2, 50));
        // then
        expect(buffer.data).toHaveLength(8);
        expect(Array.from(buffer.data)).toEqual([
            128,
            128,
            128,
            128,
            128,
            128,
            128,
            4,
        ]);
    });
    it("should decode int using one byte", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(8);
        ZigZagEncoding_1.default.encode(buffer, 56);
        buffer.resetPosition();
        // when
        const value = ZigZagEncoding_1.default.decode(buffer);
        // then
        expect(value).toBe(56);
    });
    it("should decode int using multiple bytes", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(8);
        ZigZagEncoding_1.default.encode(buffer, 70000);
        ZigZagEncoding_1.default.encode(buffer, 56);
        buffer.resetPosition();
        // when
        const value = ZigZagEncoding_1.default.decode(buffer);
        // then
        expect(value).toBe(70000);
    });
    it("should decode negative int using multiple bytes", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(8);
        ZigZagEncoding_1.default.encode(buffer, -1515);
        ZigZagEncoding_1.default.encode(buffer, 56);
        buffer.resetPosition();
        // when
        const value = ZigZagEncoding_1.default.decode(buffer);
        // then
        expect(value).toBe(-1515);
    });
    it("should decode large safe int greater than 2^32", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(4);
        ZigZagEncoding_1.default.encode(buffer, Math.pow(2, 50) + 1234);
        ZigZagEncoding_1.default.encode(buffer, 56);
        buffer.resetPosition();
        // when
        const value = ZigZagEncoding_1.default.decode(buffer);
        // then
        expect(value).toBe(Math.pow(2, 50) + 1234);
    });
});
//# sourceMappingURL=ZigZagEncoding.spec.js.map