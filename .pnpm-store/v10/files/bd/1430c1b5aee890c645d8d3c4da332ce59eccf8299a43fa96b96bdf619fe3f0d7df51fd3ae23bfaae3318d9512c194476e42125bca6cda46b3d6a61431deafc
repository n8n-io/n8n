"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ByteBuffer_1 = require("./ByteBuffer");
describe("ByteBuffer", () => {
    it("should put value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(3);
        // when
        buffer.put(123);
        // then
        expect(buffer.data[0]).toBe(123);
        expect(buffer.position).toBe(1);
    });
    it("should resize when values overflow ", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        buffer.put(123);
        // when
        buffer.put(42);
        // then
        expect(buffer.data[0]).toBe(123);
        expect(buffer.data[1]).toBe(42);
    });
    it("should get value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        buffer.put(123);
        buffer.resetPosition();
        // when
        const value = buffer.get();
        // then
        expect(value).toBe(123);
        expect(buffer.position).toBe(1);
    });
    it("should put int32 value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(8);
        // when
        buffer.putInt32(123);
        // then
        expect(buffer.data[3]).toBe(123);
        expect(buffer.position).toBe(4);
    });
    it("should resize when int32 values overflow ", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        // when
        buffer.putInt32(42);
        // then
        expect(buffer.data[3]).toBe(42);
        expect(buffer.position).toBe(4);
    });
    it("should get int32 value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        buffer.putInt32(123);
        buffer.resetPosition();
        // when
        const value = buffer.getInt32();
        // then
        expect(value).toBe(123);
        expect(buffer.position).toBe(4);
    });
    it("should put int64 value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(8);
        // when
        buffer.putInt64(123);
        // then
        expect(buffer.data[7]).toBe(123);
        expect(buffer.position).toBe(8);
    });
    it("should resize when int64 values overflow ", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        // when
        buffer.putInt64(42);
        // then
        expect(buffer.data[7]).toBe(42);
        expect(buffer.position).toBe(8);
    });
    it("should get int64 value moving the position", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1);
        buffer.putInt64(Number.MAX_SAFE_INTEGER);
        buffer.resetPosition();
        // when
        const value = buffer.getInt64();
        // then
        expect(value).toBe(Number.MAX_SAFE_INTEGER);
        expect(buffer.position).toBe(8);
    });
    it("should copy all data when putting array", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1024);
        const array = new Uint8Array([1, 2, 3, 4]);
        // when
        buffer.putArray(array);
        // then
        buffer.resetPosition();
        expect(buffer.get()).toBe(1);
        expect(buffer.get()).toBe(2);
        expect(buffer.get()).toBe(3);
        expect(buffer.get()).toBe(4);
    });
    it("should resize when putting array bigger than capacity", () => {
        // given
        const buffer = ByteBuffer_1.default.allocate(1024);
        const array = new Uint8Array([1, 2, 3, 4]);
        // when
        buffer.position = 1022;
        buffer.putArray(array);
        // then
        buffer.position = 1022;
        expect(buffer.get()).toBe(1);
        expect(buffer.get()).toBe(2);
        expect(buffer.get()).toBe(3);
        expect(buffer.get()).toBe(4);
    });
});
//# sourceMappingURL=ByteBuffer.spec.js.map