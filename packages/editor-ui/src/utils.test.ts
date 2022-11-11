import jp from "jsonpath";
import { isEmpty, intersection, getJsonSchema } from "@/utils";
import { N8nJsonSchema } from "@/Interface";

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
			[
				,
				{ type: 'undefined', value: 'undefined', path: '' },
			],
			[
				undefined,
				{ type: 'undefined', value: 'undefined', path: '' },
			],
			[
				null,
				{ type: 'string', value: '[null]', path: '' },
			],
			[
				'John',
				{ type: 'string', value: '"John"', path: '' },
			],
			[
				'123',
				{ type: 'string', value: '"123"', path: '' },
			],
			[
				123,
				{ type: 'number', value: '123', path: '' },
			],
			[
				true,
				{ type: 'boolean', value: 'true', path: '' },
			],
			[
				false,
				{ type: 'boolean', value: 'false', path: '' },
			],
			[
				() => {},
				{ type: 'function', value: '', path: '' },
			],
			[
				new Date('2022.11.22'),
				{ type: 'date', value: '2022-11-21T23:00:00.000Z', path: '' },
			],
			[
				Symbol('x'),
				{ type: 'symbol', value: 'Symbol(x)', path: '' },
			],
			[
				1n,
				{ type: 'bigint', value: '1', path: '' },
			],
			[
				['John', 1, true],
				{ type: 'list', value: 'string', path: '[*]' },
			],
			[
				{ people: ['Joe', 'John']},
				{ type: 'object',  value: [{ type: 'list', key: 'people', value: 'string', path: '.people[*]' }], path: '' },
			],
			[
				[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }],
				{ type: 'list', value: [{ type: 'string', key: 'name', value: 'string', path: '[*].name' }, { type: 'number', key: 'age', value: 'number', path: '[*].age' }], path: '[*]' },
			],
			[
				[{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] }, { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] }],
				{ type: 'list', value: [{ type: 'string', key: 'name', value: 'string', path: '[*].name' }, { type: 'number', key: 'age', value: 'number', path: '[*].age' }, { type: 'list', key: 'hobbies', value: 'string', path: '[*].hobbies[*]' }], path: '[*]' },
			],
			[
				[],
				{ type: 'list', value: 'undefined', path: '[*]' },
			],
			[
				[[1,2]],
				{ type: 'list', value: { type: 'list', value: 'number', path: '[*][*]' }, path: '[*]' },
			],
			[
				[[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }]],
				{ type: 'list', value: { type: 'list', value:  [{ type: 'string', key: 'name', value: 'string', path: '[*][*].name' }, { type: 'number', key: 'age', value: 'number', path: '[*][*].age' }], path: '[*][*]' }, path: '[*]' },
			],
			[
				[{ dates: [[new Date('2022.11.22'), new Date('2022.11.23')], [new Date('2022.12.22'), new Date('2022.12.23')]] }],
				{ type: 'list', value: [{ type: 'list', key: 'dates', value: { type: 'list', value: 'date', path: '[*].dates[*][*]' }, path: '[*].dates[*]' }], path: '[*]' },
			],
		])('should return the correct json schema for %s', (input, schema) => {
			expect(getJsonSchema(input)).toEqual(schema);
		});

		it('should return the correct data when using the generated json path on an object', () => {
			const input = { people: ['Joe', 'John']};
			const schema = getJsonSchema(input) as N8nJsonSchema;
			const pathData = jp.query(input, `$${ ((schema.value as N8nJsonSchema[])[0] as N8nJsonSchema).path }`);
			expect(pathData).toEqual(['Joe', 'John']);
		});

		it('should return the correct data when using the generated json path on a list', () => {
			const input = [{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] }, { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] }];
			const schema = getJsonSchema(input) as N8nJsonSchema;
			const pathData = jp.query(input, `$${ ((schema.value as N8nJsonSchema[])[2] as N8nJsonSchema).path }`);
			expect(pathData).toEqual(['surfing', 'traveling', 'skateboarding', 'gaming']);
		});

		it('should return the correct data when using the generated json path on a list of list', () => {
			const input = [[1,2]];
			const schema = getJsonSchema(input) as N8nJsonSchema;
			const pathData = jp.query(input, `$${ (schema.value as N8nJsonSchema).path }`);
			expect(pathData).toEqual([1, 2]);
		});

		it('should return the correct data when using the generated json path on a list of list of objects', () => {
			const input = [[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }]];
			const schema = getJsonSchema(input) as N8nJsonSchema;
			const pathData = jp.query(input, `$${ ((schema.value as N8nJsonSchema).value as N8nJsonSchema[])[1].path }`);
			expect(pathData).toEqual([22, 33]);
		});

		it('should return the correct data when using the generated json path on a list of objects with a list of date tuples', () => {
			const input = [{ dates: [[new Date('2022.11.22'), new Date('2022.11.23')], [new Date('2022.12.22'), new Date('2022.12.23')]] }];
			const schema = getJsonSchema(input) as N8nJsonSchema;
			const pathData = jp.query(input, `$${ ((schema.value as N8nJsonSchema[])[0].value as N8nJsonSchema).path }`);
			expect(pathData).toEqual([new Date('2022.11.22'), new Date('2022.11.23'),new Date('2022.12.22'), new Date('2022.12.23')]);
		});
	});
});
