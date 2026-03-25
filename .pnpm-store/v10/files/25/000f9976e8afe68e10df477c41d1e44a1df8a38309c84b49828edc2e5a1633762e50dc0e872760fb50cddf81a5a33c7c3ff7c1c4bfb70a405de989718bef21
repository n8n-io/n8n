"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatters_1 = require("./formatters");
describe("Integer formatter", () => {
    it("should format integer as a string", () => {
        // given
        const formatter = (0, formatters_1.integerFormatter)(3);
        // when
        const result = formatter(123);
        // then
        expect(result).toBe("123");
    });
    it("should add padding on the left when input has a few digits", () => {
        // given
        const formatter = (0, formatters_1.integerFormatter)(5);
        // when
        const result = formatter(123);
        // then
        expect(result).toBe("  123");
    });
});
describe("Integer processor", () => {
    it("should keep value unchanged when value small enough comapred to number of value digits", () => {
        // given
        const processor = (0, formatters_1.keepSignificantDigits)(3);
        // when
        const result = processor(421);
        // then
        expect(result).toBe(421);
    });
    it("should lower value when value has more digits than what is needed", () => {
        // given
        const processor = (0, formatters_1.keepSignificantDigits)(3);
        // when
        const result = processor(123456);
        // then
        expect(result).toBe(123000);
    });
});
describe("Float formatter", () => {
    it("should format float as a string", () => {
        // given
        const formatter = (0, formatters_1.floatFormatter)(5, 2);
        // when
        const result = formatter(12.34);
        // then
        expect(result).toBe("12.34");
    });
    it("should format float as a string with given number of fraction digits", () => {
        // given
        const formatter = (0, formatters_1.floatFormatter)(5, 2);
        // when
        const result = formatter(12.342);
        // then
        expect(result).toBe("12.34");
    });
    it("should format float as a string adding fraction digits", () => {
        // given
        const formatter = (0, formatters_1.floatFormatter)(5, 2);
        // when
        const result = formatter(12.3);
        // then
        expect(result).toBe("12.30");
    });
    it("should format the whole float input even with lots of digits", () => {
        // given
        const formatter = (0, formatters_1.floatFormatter)(5, 2);
        // when
        const result = formatter(12456789.34);
        // then
        expect(result).toBe("12456789.34");
    });
    it("should add padding on the left when not enough digits", () => {
        // given
        const formatter = (0, formatters_1.floatFormatter)(5, 2);
        // when
        const result = formatter(9.34);
        // then
        expect(result).toBe(" 9.34");
    });
});
//# sourceMappingURL=formatters.spec.js.map