import { isValidDate } from './utils';
import jp from "jsonpath";
import { isEmpty, intersection, mergeDeep, getJsonSchema } from "@/utils";
import { JsonSchema } from "@/Interface";

describe("Utils", () => {
	describe("isEmpty", () => {
		test.each([
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

	describe("mergeDeep", () => {
		test.each([
			[
				[[1, 2], [3, 4]],
				[1, 2, 3, 4],
			],
			[
				[[1, 2, 3], [4, 5]],
				[1, 2, 3, 4, 5],
			],
			[
				[[1, 2], [3, 4, 5]],
				[1, 2, 3, 4, 5],
			],
			[
				[{a:1, b: [1, 2, {d: 2}]},{}],
				{a:1, b: [1, 2, {d:2}]},
			],
			[
				[[{a:1, b: [1, 2, {d: 2}]}],[]],
				[{a:1, b: [1, 2, {d:2}]}],
			],
			[
				[{a: 1, b: [1, 2, 3]}, {a: 2, b: [4, 5, 6, 7], c: "2"}, {a: 3, b: [8, 9], d: "3"}],
				{a: 3, b: [1, 2, 3, 4, 5, 6, 7, 8, 9], c: "2", d: "3"},
			],
			[
				[{a: 1, b: [{x: 'a'}]}, {a: 2, b: [{y: 'b'}], c: "2"}, {a: 3, b: [{z: 'c'}], d: "3"}],
				{a: 3, b: [{x: 'a', y: 'b', z: 'c'}], c: "2", d: "3"},
			],
			[
				[{a: 1, b: [{x: 'a'}, {w: 'd'}]}, {a: 2, b: [{y: 'b'}], c: "2"}, {a: 3, b: [{z: 'c'}], d: "3"}],
				{a: 3, b: [{x: 'a', y: 'b', z: 'c'}, {w: 'd'}], c: "2", d: "3"},
			],
		])(`for sources %s should return %s`, (sources, expected) => {
			expect(mergeDeep(...sources)).toEqual(expected);
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
				{ type: 'string', value: 'John', path: '' },
			],
			[
				'123',
				{ type: 'string', value: '123', path: '' },
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
				new Date('2022-11-22T00:00:00.000Z'),
				{ type: 'date', value: '2022-11-22T00:00:00.000Z', path: '' },
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
				{ type: 'list', value: [{ type: 'string', value: 'John', key: '0', path: '[0]' }, { type: 'number', value: '1', key: '1', path: '[1]' }, { type: 'boolean', value: 'true', key: '2', path: '[2]' }], path: '' },
			],
			[
				{ people: ['Joe', 'John']},
				{ type: 'object',  value: [{ type: 'list', key: 'people', value: [{ type: 'string', value: 'Joe', key: '0', path: '["people"][0]' }, { type: 'string', value: 'John', key: '1', path: '["people"][1]' }], path: '["people"]' }], path: '' },
			],
			[
				[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }],
				{ type: 'list', value: [{ type: 'object', key: '0', value: [{ type: 'string', key: 'name', value: 'John', path: '[0]["name"]'}, { type: 'number', key: 'age', value: '22', path: '[0]["age"]' }], path: '[0]'}, { type: 'object', key: '1', value: [{ type: 'string', key: 'name', value: 'Joe', path: '[1]["name"]'}, { type: 'number', key: 'age', value: '33', path: '[1]["age"]' }], path: '[1]'}], path: '' },
			],
			[
				[{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] }, { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] }],
				{ type: 'list', value: [{ type: 'object', key: '0', value: [{ type: 'string', key: 'name', value: 'John', path: '[0]["name"]'}, { type: 'number', key: 'age', value: '22', path: '[0]["age"]' }, {type: 'list', key: 'hobbies', value: [{type: 'string', key: '0', value: 'surfing', path: '[0]["hobbies"][0]'},{type: 'string', key: '1', value: 'traveling', path: '[0]["hobbies"][1]'}], path: '[0]["hobbies"]'}], path: '[0]'}, { type: 'object', key: '1', value: [{ type: 'string', key: 'name', value: 'Joe', path: '[1]["name"]'}, { type: 'number', key: 'age', value: '33', path: '[1]["age"]' }, {type: 'list', key: 'hobbies', value: [{type: 'string', key: '0', value: 'skateboarding', path: '[1]["hobbies"][0]'},{type: 'string', key: '1', value: 'gaming', path: '[1]["hobbies"][1]'}], path: '[1]["hobbies"]'}], path: '[1]'}], path: '' },
			],
			[
				[],
				{ type: 'list', value: [], path: '' },
			],
			[
				[[1,2]],
				{ type: 'list', value: [{ type: 'list', key: '0', value: [{type: 'number', key: '0', value: '1', path: '[0][0]'}, {type: 'number', key: '1', value: '2', path: '[0][1]'}], path: '[0]' }], path: '' },
			],
			[
				[[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }]],
				{ type: 'list', value: [{type: 'list', key: '0', value:[{ type: 'object', key: '0', value: [{ type: 'string', key: 'name', value: 'John', path: '[0][0]["name"]'}, { type: 'number', key: 'age', value: '22', path: '[0][0]["age"]' }], path: '[0][0]'}, { type: 'object', key: '1', value: [{ type: 'string', key: 'name', value: 'Joe', path: '[0][1]["name"]'}, { type: 'number', key: 'age', value: '33', path: '[0][1]["age"]' }], path: '[0][1]'}], path: '[0]'}], path: '' },
			],
			[
				[{ dates: [[new Date('2022-11-22T00:00:00.000Z'), new Date('2022-11-23T00:00:00.000Z')], [new Date('2022-12-22T00:00:00.000Z'), new Date('2022-12-23T00:00:00.000Z')]] }],
				{ type: 'list', value: [{ type: 'object', key: '0', value: [{ type: 'list', key: 'dates', value: [{ type: 'list', key: '0', value: [{type: 'date', key: '0', value: '2022-11-22T00:00:00.000Z', path: '[0]["dates"][0][0]'}, {type: 'date', key: '1', value: '2022-11-23T00:00:00.000Z', path: '[0]["dates"][0][1]'}], path: '[0]["dates"][0]' }, { type: 'list', key: '1', value: [{type: 'date', key: '0', value: '2022-12-22T00:00:00.000Z', path: '[0]["dates"][1][0]'}, {type: 'date', key: '1', value: '2022-12-23T00:00:00.000Z', path: '[0]["dates"][1][1]'}], path: '[0]["dates"][1]' }], path: '[0]["dates"]' }], path: '[0]' }], path: '' },
			],
		])('should return the correct json schema for %s', (input, schema) => {
			expect(getJsonSchema(input)).toEqual(schema);
		});

		it('should return the correct data when using the generated json path on an object', () => {
			const input = { people: ['Joe', 'John']};
			const schema = getJsonSchema(input) as JsonSchema;
			const pathData = jp.query(input, `$${ ((schema.value as JsonSchema[])[0].value as JsonSchema[])[0].path }`);
			expect(pathData).toEqual(['Joe']);
		});

		it('should return the correct data when using the generated json path on a list', () => {
			const input = [{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] }, { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] }];
			const schema = getJsonSchema(input) as JsonSchema;
			const pathData = jp.query(input, `$${ (((schema.value as JsonSchema[])[0].value as JsonSchema[])[2].value as JsonSchema[])[1].path }`);
			expect(pathData).toEqual(['traveling']);
		});

		it('should return the correct data when using the generated json path on a list of list', () => {
			const input = [[1,2]];
			const schema = getJsonSchema(input) as JsonSchema;
			const pathData = jp.query(input, `$${ (((schema.value as JsonSchema[])[0]).value as JsonSchema[])[1].path }`);
			expect(pathData).toEqual([2]);
		});

		it('should return the correct data when using the generated json path on a list of list of objects', () => {
			const input = [[{ name: 'John', age: 22 }, { name: 'Joe', age: 33 }]];
			const schema = getJsonSchema(input) as JsonSchema;
			const pathData = jp.query(input, `$${ (((schema.value as JsonSchema[])[0].value as JsonSchema[])[1].value as JsonSchema[])[1].path}`);
			expect(pathData).toEqual([33]);
		});

		it('should return the correct data when using the generated json path on a list of objects with a list of date tuples', () => {
			const input = [{ dates: [[new Date('2022-11-22T00:00:00.000Z'), new Date('2022-11-23T00:00:00.000Z')], [new Date('2022-12-22T00:00:00.000Z'), new Date('2022-12-23T00:00:00.000Z')]] }];
			const schema = getJsonSchema(input) as JsonSchema;
			const pathData = jp.query(input, `$${ ((((schema.value as JsonSchema[])[0].value as JsonSchema[])[0].value as JsonSchema[])[0].value as JsonSchema[])[0].path}`);
			expect(pathData).toEqual([new Date('2022-11-22T00:00:00.000Z')]);
		});
	});

	describe("dateTests", () => {
		test.each([
			'04-08-2021',
			'15.11.2022 12:34h',
			'15.11.2022. 12:34h',
			'21-03-1988 12:34h',
			'2022-11-15',
			'11/11/2022',
			1668470400000,
			'2021-1-01',
			'2021-01-1',
			'2021/11/24',
			'2021/04/08',
			'Mar 25 2015',
			'25 Mar 2015',
			'2019-06-11T00:00',
			'2022-11-15T19:21:13.932Z',
			'Tue Jan 01 2019 02:07:00 GMT+0530',
			new Date(),
			'4/08/2021',
			'2021/04/04',
		])('should correctly recognize dates', (input) => {
			expect(isValidDate(input)).toBeTruthy();
		});
	});
});
