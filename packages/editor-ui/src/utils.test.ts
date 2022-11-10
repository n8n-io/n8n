import { isEmpty, intersection, getJsonSchema } from "@/utils";

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

	describe("getJsonSchema", () => {
		test.each([
			[, { type: 'undefined', value: 'undefined' }],
			[undefined, { type: 'undefined', value: 'undefined' }],
			[null, { type: 'string', value: '[null]' }],
			['John', { type: 'string', value: '"John"' }],
			['123', { type: 'string', value: '"123"' }],
			[123, { type: 'number', value: '123' }],
			[true, { type: 'boolean', value: 'true' }],
			[false, { type: 'boolean', value: 'false' }],
			[() => {}, { type: 'function', value: '' }],
			[Symbol('x'), { type: 'symbol', value: 'Symbol(x)' }],
			[1n, { type: 'bigint', value: '1' }],
			[['John', 1, true], { type: 'list', value: 'string' }],
			[{people: ['Joe', 'John']}, { type: 'object',  value: [{ type: 'list', key: 'people', value: 'string' }] }],
			[[{name: 'John', age: 22}, {name: 'Joe', age: 33}], { type: 'list', value: [{ type: 'string', key: 'name', value: 'string' }, { type: 'number', key: 'age', value: 'number' }] }],
			[[{name: 'John', age: 22, hobbies: ['surfing', 'traveling']}, {name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming']}], { type: 'list', value: [{ type: 'string', key: 'name', value: 'string' }, { type: 'number', key: 'age', value: 'number' }, { type: 'list', key: 'hobbies', value: 'string' }] }],
		])('should return the correct json schema for %s', (input, schema) => {
			expect(getJsonSchema(input)).toEqual(schema);
		});
	});
});
