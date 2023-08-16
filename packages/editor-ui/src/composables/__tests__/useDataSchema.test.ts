import jp from 'jsonpath';
import { useDataSchema } from '@/composables';
import type { Schema } from '@/Interface';

describe('useDataSchema', () => {
	const getSchema = useDataSchema().getSchema;
	describe('getSchema', () => {
		test.each([
			[, { type: 'undefined', value: 'undefined', path: '' }],
			[undefined, { type: 'undefined', value: 'undefined', path: '' }],
			[null, { type: 'null', value: '[null]', path: '' }],
			['John', { type: 'string', value: 'John', path: '' }],
			['123', { type: 'string', value: '123', path: '' }],
			[123, { type: 'number', value: '123', path: '' }],
			[true, { type: 'boolean', value: 'true', path: '' }],
			[false, { type: 'boolean', value: 'false', path: '' }],
			[() => {}, { type: 'function', value: '', path: '' }],
			[{}, { type: 'object', value: [], path: '' }],
			[[], { type: 'array', value: [], path: '' }],
			[
				new Date('2022-11-22T00:00:00.000Z'),
				{ type: 'string', value: '2022-11-22T00:00:00.000Z', path: '' },
			],
			[Symbol('x'), { type: 'symbol', value: 'Symbol(x)', path: '' }],
			[1n, { type: 'bigint', value: '1', path: '' }],
			[
				['John', 1, true],
				{
					type: 'array',
					value: [
						{ type: 'string', value: 'John', key: '0', path: '[0]' },
						{ type: 'number', value: '1', key: '1', path: '[1]' },
						{ type: 'boolean', value: 'true', key: '2', path: '[2]' },
					],
					path: '',
				},
			],
			[
				{ people: ['Joe', 'John'] },
				{
					type: 'object',
					value: [
						{
							type: 'array',
							key: 'people',
							value: [
								{ type: 'string', value: 'Joe', key: '0', path: '.people[0]' },
								{ type: 'string', value: 'John', key: '1', path: '.people[1]' },
							],
							path: '.people',
						},
					],
					path: '',
				},
			],
			[
				{ 'with space': [], 'with.dot': 'test' },
				{
					type: 'object',
					value: [
						{
							type: 'array',
							key: 'with space',
							value: [],
							path: "['with space']",
						},
						{
							type: 'string',
							key: 'with.dot',
							value: 'test',
							path: "['with.dot']",
						},
					],
					path: '',
				},
			],
			[
				[
					{ name: 'John', age: 22 },
					{ name: 'Joe', age: 33 },
				],
				{
					type: 'array',
					value: [
						{
							type: 'object',
							key: '0',
							value: [
								{ type: 'string', key: 'name', value: 'John', path: '[0].name' },
								{ type: 'number', key: 'age', value: '22', path: '[0].age' },
							],
							path: '[0]',
						},
						{
							type: 'object',
							key: '1',
							value: [
								{ type: 'string', key: 'name', value: 'Joe', path: '[1].name' },
								{ type: 'number', key: 'age', value: '33', path: '[1].age' },
							],
							path: '[1]',
						},
					],
					path: '',
				},
			],
			[
				[
					{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] },
					{ name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] },
				],
				{
					type: 'array',
					value: [
						{
							type: 'object',
							key: '0',
							value: [
								{ type: 'string', key: 'name', value: 'John', path: '[0].name' },
								{ type: 'number', key: 'age', value: '22', path: '[0].age' },
								{
									type: 'array',
									key: 'hobbies',
									value: [
										{ type: 'string', key: '0', value: 'surfing', path: '[0].hobbies[0]' },
										{ type: 'string', key: '1', value: 'traveling', path: '[0].hobbies[1]' },
									],
									path: '[0].hobbies',
								},
							],
							path: '[0]',
						},
						{
							type: 'object',
							key: '1',
							value: [
								{ type: 'string', key: 'name', value: 'Joe', path: '[1].name' },
								{ type: 'number', key: 'age', value: '33', path: '[1].age' },
								{
									type: 'array',
									key: 'hobbies',
									value: [
										{ type: 'string', key: '0', value: 'skateboarding', path: '[1].hobbies[0]' },
										{ type: 'string', key: '1', value: 'gaming', path: '[1].hobbies[1]' },
									],
									path: '[1].hobbies',
								},
							],
							path: '[1]',
						},
					],
					path: '',
				},
			],
			[[], { type: 'array', value: [], path: '' }],
			[
				[[1, 2]],
				{
					type: 'array',
					value: [
						{
							type: 'array',
							key: '0',
							value: [
								{ type: 'number', key: '0', value: '1', path: '[0][0]' },
								{ type: 'number', key: '1', value: '2', path: '[0][1]' },
							],
							path: '[0]',
						},
					],
					path: '',
				},
			],
			[
				[
					[
						{ name: 'John', age: 22 },
						{ name: 'Joe', age: 33 },
					],
				],
				{
					type: 'array',
					value: [
						{
							type: 'array',
							key: '0',
							value: [
								{
									type: 'object',
									key: '0',
									value: [
										{ type: 'string', key: 'name', value: 'John', path: '[0][0].name' },
										{ type: 'number', key: 'age', value: '22', path: '[0][0].age' },
									],
									path: '[0][0]',
								},
								{
									type: 'object',
									key: '1',
									value: [
										{ type: 'string', key: 'name', value: 'Joe', path: '[0][1].name' },
										{ type: 'number', key: 'age', value: '33', path: '[0][1].age' },
									],
									path: '[0][1]',
								},
							],
							path: '[0]',
						},
					],
					path: '',
				},
			],
			[
				[
					{
						dates: [
							[new Date('2022-11-22T00:00:00.000Z'), new Date('2022-11-23T00:00:00.000Z')],
							[new Date('2022-12-22T00:00:00.000Z'), new Date('2022-12-23T00:00:00.000Z')],
						],
					},
				],
				{
					type: 'array',
					value: [
						{
							type: 'object',
							key: '0',
							value: [
								{
									type: 'array',
									key: 'dates',
									value: [
										{
											type: 'array',
											key: '0',
											value: [
												{
													type: 'string',
													key: '0',
													value: '2022-11-22T00:00:00.000Z',
													path: '[0].dates[0][0]',
												},
												{
													type: 'string',
													key: '1',
													value: '2022-11-23T00:00:00.000Z',
													path: '[0].dates[0][1]',
												},
											],
											path: '[0].dates[0]',
										},
										{
											type: 'array',
											key: '1',
											value: [
												{
													type: 'string',
													key: '0',
													value: '2022-12-22T00:00:00.000Z',
													path: '[0].dates[1][0]',
												},
												{
													type: 'string',
													key: '1',
													value: '2022-12-23T00:00:00.000Z',
													path: '[0].dates[1][1]',
												},
											],
											path: '[0].dates[1]',
										},
									],
									path: '[0].dates',
								},
							],
							path: '[0]',
						},
					],
					path: '',
				},
			],
		])('should return the correct json schema for %s', (input, schema) => {
			expect(getSchema(input)).toEqual(schema);
		});

		it('should return the correct data when using the generated json path on an object', () => {
			const input = { people: ['Joe', 'John'] };
			const schema = getSchema(input) as Schema;
			const pathData = jp.query(
				input,
				`$${((schema.value as Schema[])[0].value as Schema[])[0].path}`,
			);
			expect(pathData).toEqual(['Joe']);
		});

		it('should return the correct data when using the generated json path on a list', () => {
			const input = [
				{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] },
				{ name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] },
			];
			const schema = getSchema(input) as Schema;
			const pathData = jp.query(
				input,
				`$${(((schema.value as Schema[])[0].value as Schema[])[2].value as Schema[])[1].path}`,
			);
			expect(pathData).toEqual(['traveling']);
		});

		it('should return the correct data when using the generated json path on a list of list', () => {
			const input = [[1, 2]];
			const schema = getSchema(input) as Schema;
			const pathData = jp.query(
				input,
				`$${((schema.value as Schema[])[0].value as Schema[])[1].path}`,
			);
			expect(pathData).toEqual([2]);
		});

		it('should return the correct data when using the generated json path on a list of list of objects', () => {
			const input = [
				[
					{ name: 'John', age: 22 },
					{ name: 'Joe', age: 33 },
				],
			];
			const schema = getSchema(input) as Schema;
			const pathData = jp.query(
				input,
				`$${(((schema.value as Schema[])[0].value as Schema[])[1].value as Schema[])[1].path}`,
			);
			expect(pathData).toEqual([33]);
		});

		it('should return the correct data when using the generated json path on a list of objects with a list of date tuples', () => {
			const input = [
				{
					dates: [
						[new Date('2022-11-22T00:00:00.000Z'), new Date('2022-11-23T00:00:00.000Z')],
						[new Date('2022-12-22T00:00:00.000Z'), new Date('2022-12-23T00:00:00.000Z')],
					],
				},
			];
			const schema = getSchema(input) as Schema;
			const pathData = jp.query(
				input,
				`$${
					(
						(((schema.value as Schema[])[0].value as Schema[])[0].value as Schema[])[0]
							.value as Schema[]
					)[0].path
				}`,
			);
			expect(pathData).toEqual([new Date('2022-11-22T00:00:00.000Z')]);
		});
	});
});
