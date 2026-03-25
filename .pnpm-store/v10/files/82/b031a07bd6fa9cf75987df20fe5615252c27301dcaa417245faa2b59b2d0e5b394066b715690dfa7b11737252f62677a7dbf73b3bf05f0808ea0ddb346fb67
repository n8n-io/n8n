"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * This is a TypeScript port of the original Java version, which was written by
 * Gil Tene as described in
 * https://github.com/HdrHistogram/HdrHistogram
 * and released to the public domain, as explained at
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
const PackedArrayContext_1 = require("./PackedArrayContext");
const PackedArray_1 = require("./PackedArray");
const { pow } = Math;
describe("Packed array context", () => {
    it("Should initialize array", () => {
        const ctx = new PackedArrayContext_1.PackedArrayContext(1024, 128);
        expect(ctx.isPacked).toBe(true);
        expect(ctx.getPopulatedShortLength()).toBeGreaterThan(0);
    });
});
describe("Packed array", () => {
    it("Should initialize array", () => {
        const array = new PackedArray_1.PackedArray(1024, 128);
        expect(array.getPhysicalLength()).toBe(128);
        expect(array.length()).toBe(1024);
    });
    it("Should retrieve data stored in array", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        // when
        array.set(16, 1);
        array.set(12, 42);
        // then
        expect(array.get(12)).toBe(42);
        expect(array.get(16)).toBe(1);
    });
    it("Should resize array when storing data", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        // when
        array.set(12, 361);
        // then
        const storedData = array.get(12);
        expect(storedData).toBe(361);
    });
    it("Should retrieve big numbers stored in array", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        // when
        array.set(12, Math.pow(2, 16) + 1);
        // then
        const storedData = array.get(12);
        expect(storedData).toBe(Math.pow(2, 16) + 1);
    });
    it("Should copy data when resizing array", () => {
        const array = new PackedArray_1.PackedArray(1024);
        for (let value = 1; value <= 272; value++) {
            array.set(value, value);
        }
        expect(array.get(1)).toBe(1);
        expect(array.get(255)).toBe(255);
        expect(array.get(272)).toBe(272);
    });
    it("Should increment data stored in array", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        array.set(16, 1);
        // when
        array.add(16, 41);
        // then
        expect(array.get(16)).toBe(42);
    });
    it("Should increment data stored in array with big numbers", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        array.set(16, 42);
        // when
        array.add(16, pow(2, 33));
        // then
        expect(array.get(16)).toBe(pow(2, 33) + 42);
    });
    it("Should increment data stored in array with big numbers when a resize is needed", () => {
        // given
        const array = new PackedArray_1.PackedArray(10000, 16);
        array.set(6144, 243);
        array.set(60, 243);
        array.set(1160, 243);
        // when
        array.add(6144, 25);
        // then
        expect(array.get(6144)).toBe(268);
    });
    it("Should increment data stored in array with big numbers", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        array.set(16, 42);
        // when
        array.add(16, pow(2, 33));
        // then
        expect(array.get(16)).toBe(pow(2, 33) + 42);
    });
    it("Should clear data stored in array", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, 16);
        array.set(16, 42);
        // when
        array.clear();
        // then
        expect(array.get(16)).toBe(0);
    });
    it("Should resize array when virtual length change", () => {
        // given
        const array = new PackedArray_1.PackedArray(16, 16);
        array.set(7, 42);
        // when
        array.setVirtualLength(pow(2, 20));
        array.add(pow(2, 19), 42);
        // then
        expect(array.get(7)).toBe(42);
        expect(array.get(pow(2, 19))).toBe(42);
    });
    it("should handle properly big numbers", () => {
        // given
        const array = new PackedArray_1.PackedArray(45056, 16);
        // when
        array.set(32768, 1);
        // then
        expect(array.get(32768)).toBe(1);
        expect(array.get(0)).toBe(0);
    });
});
describe("Unpacked array", () => {
    it("Should increment data stored in array", () => {
        // given
        const array = new PackedArray_1.PackedArray(1024, pow(2, 20));
        array.set(16, 1);
        // when
        array.add(16, 41);
        // then
        expect(array.get(16)).toBe(42);
    });
});
//# sourceMappingURL=PackedArray.spec.js.map