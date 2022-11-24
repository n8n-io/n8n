import { isEmpty, intersection } from "@/utils";

describe("Utils", () => {
	describe("isEmpty", () => {
		it.each([
			[undefined, true],
			[null, true],
			[{}, true],
			[{ a: {}}, true],
			[{ a: { b: []}}, true],
			[{ a: { b: [1]}}, false],
			[[], true],
			[[{}, {}, {}], true],
			[[{}, null, false], true],
			[[{}, null, false, 1], false],
			[[[], [], []], true],
			["", true],
			["0", false],
			[0, false],
			[1, false],
			[false, true],
			[true, false],
		])(`for value %s should return %s`, (value, expected) => {
			expect(isEmpty(value)).toBe(expected);
		});
	});

	describe("intersection", () => {
		it("should return the intersection of two arrays", () => {
			expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
		});

		it("should return the intersection of two arrays without duplicates", () => {
			expect(intersection([1, 2, 2, 3], [2, 2, 3, 4])).toEqual([2, 3]);
		});

		it("should return the intersection of four arrays without duplicates", () => {
			expect(intersection([1, 2, 2, 3, 4], [2, 3, 3, 4], [2, 1, 5, 4, 4, 1], [2, 4, 5, 5, 6, 7])).toEqual([2, 4]);
		});
	});
});
