import jp from 'jsonpath';
import { useDataSchema, useFlattenSchema, type SchemaNode } from '@/composables/useDataSchema';
import type { IExecutionResponse, INodeUi, Schema } from '@/Interface';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type ITaskDataConnections,
} from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { JSONSchema7 } from 'json-schema';
import { mock } from 'vitest-mock-extended';

vi.mock('@/stores/workflows.store');

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
			const schema = getSchema(input);
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
			const schema = getSchema(input);
			const pathData = jp.query(
				input,
				`$${(((schema.value as Schema[])[0].value as Schema[])[2].value as Schema[])[1].path}`,
			);
			expect(pathData).toEqual(['traveling']);
		});

		it('should return the correct data when using the generated json path on a list of list', () => {
			const input = [[1, 2]];
			const schema = getSchema(input);
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
			const schema = getSchema(input);
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
			const schema = getSchema(input);
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

	describe('filterSchema', () => {
		const filterSchema = useDataSchema().filterSchema;
		it('should correctly filter a flat schema', () => {
			const flatSchema: Schema = {
				type: 'object',
				value: [
					{
						key: 'name',
						type: 'string',
						value: 'First item',
						path: '.name',
					},
					{
						key: 'code',
						type: 'number',
						value: '1',
						path: '.code',
					},
					{
						key: 'email',
						type: 'string',
						value: 'first item@gmail.com',
						path: '.email',
					},
				],
				path: '',
			};

			expect(filterSchema(flatSchema, 'mail')).toEqual({
				path: '',
				type: 'object',
				value: [
					{
						key: 'email',
						path: '.email',
						type: 'string',
						value: 'first item@gmail.com',
					},
				],
			});
			expect(filterSchema(flatSchema, '1')).toEqual({
				path: '',
				type: 'object',
				value: [
					{
						key: 'code',
						path: '.code',
						type: 'number',
						value: '1',
					},
				],
			});
			expect(filterSchema(flatSchema, 'no match')).toEqual(null);
		});

		it('should correctly filter a nested schema', () => {
			const nestedSchema: Schema = {
				type: 'object',
				value: [
					{
						key: 'name',
						type: 'string',
						value: 'First item',
						path: '.name',
					},
					{
						key: 'code',
						type: 'number',
						value: '1',
						path: '.code',
					},
					{
						key: 'email',
						type: 'string',
						value: 'first item@gmail.com',
						path: '.email',
					},
					{
						key: 'obj',
						type: 'object',
						value: [
							{
								key: 'foo',
								type: 'object',
								value: [
									{
										key: 'nested',
										type: 'string',
										value: 'bar',
										path: '.obj.foo.nested',
									},
								],
								path: '.obj.foo',
							},
						],
						path: '.obj',
					},
				],
				path: '',
			};

			expect(filterSchema(nestedSchema, 'bar')).toEqual({
				path: '',
				type: 'object',
				value: [
					{
						key: 'obj',
						path: '.obj',
						type: 'object',
						value: [
							{
								key: 'foo',
								path: '.obj.foo',
								type: 'object',
								value: [
									{
										key: 'nested',
										path: '.obj.foo.nested',
										type: 'string',
										value: 'bar',
									},
								],
							},
						],
					},
				],
			});
			expect(filterSchema(nestedSchema, '1')).toEqual({
				path: '',
				type: 'object',
				value: [
					{
						key: 'code',
						path: '.code',
						type: 'number',
						value: '1',
					},
				],
			});
			expect(filterSchema(nestedSchema, 'no match')).toEqual(null);
		});

		it('should not filter schema with empty search', () => {
			const flatSchema: Schema = {
				type: 'object',
				value: [
					{
						key: 'name',
						type: 'string',
						value: 'First item',
						path: '.name',
					},
					{
						key: 'code',
						type: 'number',
						value: '1',
						path: '.code',
					},
					{
						key: 'email',
						type: 'string',
						value: 'first item@gmail.com',
						path: '.email',
					},
				],
				path: '',
			};

			expect(filterSchema(flatSchema, '')).toEqual(flatSchema);
		});
	});

	describe('getNodeInputData', () => {
		const getNodeInputData = useDataSchema().getNodeInputData;

		beforeEach(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		const name = 'a';
		const makeMockData = (data: ITaskDataConnections | undefined, runDataKey?: string) => ({
			data: {
				resultData: {
					runData: {
						[runDataKey ?? name]: [
							{ data, startTime: 0, executionTime: 0, executionIndex: 0, source: [] },
						],
					},
				},
			},
		});

		const mockExecutionDataMarker = Symbol() as unknown as INodeExecutionData[];
		const Main = NodeConnectionTypes.Main;

		test.each<
			[
				[Partial<INodeUi> | null, number, number, Partial<IExecutionResponse> | null],
				ReturnType<typeof getNodeInputData>,
			]
		>([
			//
			// Null / Out of Bounds Cases
			//
			[[null, 0, 0, null], []],
			[[{ name }, 0, 0, null], []],
			[[{ name }, 0, 0, { data: undefined }], []],
			[[{ name }, 0, 0, { data: { resultData: { runData: {} } } }], []],
			[[{ name }, 0, 0, { data: { resultData: { runData: { [name]: [] } } } }], []],
			[[{ name }, 0, 0, makeMockData(undefined)], []],
			[[{ name }, 1, 0, makeMockData({})], []],
			[[{ name }, -1, 0, makeMockData({})], []],
			[[{ name }, 0, 0, makeMockData({}, 'DIFFERENT_NAME')], []],
			// getMainInputData cases
			[[{ name }, 0, 0, makeMockData({ [Main]: [] })], []],
			[[{ name }, 0, 0, makeMockData({ [Main]: [null] })], []],
			[[{ name }, 0, 1, makeMockData({ [Main]: [null] })], []],
			[[{ name }, 0, -1, makeMockData({ [Main]: [null] })], []],
			[
				[{ name }, 0, 0, makeMockData({ [Main]: [mockExecutionDataMarker] })],
				mockExecutionDataMarker,
			],
			[
				[{ name }, 0, 0, makeMockData({ [Main]: [mockExecutionDataMarker, null] })],
				mockExecutionDataMarker,
			],
			[
				[{ name }, 0, 1, makeMockData({ [Main]: [null, mockExecutionDataMarker] })],
				mockExecutionDataMarker,
			],
			[
				[
					{ name },
					0,
					1,
					makeMockData({ DIFFERENT_NAME: [], [Main]: [null, mockExecutionDataMarker] }),
				],
				mockExecutionDataMarker,
			],
			[
				[
					{ name },
					2,
					1,
					{
						data: {
							resultData: {
								runData: {
									[name]: [
										{
											startTime: 0,
											executionTime: 0,
											executionIndex: 0,
											source: [],
										},
										{
											startTime: 0,
											executionTime: 0,
											executionIndex: 1,
											source: [],
										},
										{
											data: { [Main]: [null, mockExecutionDataMarker] },
											startTime: 0,
											executionTime: 0,
											executionIndex: 2,
											source: [],
										},
									],
								},
							},
						},
					},
				],
				mockExecutionDataMarker,
			],
		])(
			'should return correct output %s',
			([node, runIndex, outputIndex, getWorkflowExecution], output) => {
				vi.mocked(useWorkflowsStore).mockReturnValue({
					...useWorkflowsStore(),
					getWorkflowExecution: getWorkflowExecution as IExecutionResponse,
				});
				expect(getNodeInputData(node as INodeUi, runIndex, outputIndex)).toEqual(output);
			},
		);
	});

	describe('getSchemaForJsonSchema', () => {
		const getSchemaForJsonSchema = useDataSchema().getSchemaForJsonSchema;

		it('should convert JSON schema to Schema type', () => {
			const jsonSchema: JSONSchema7 = {
				type: 'object',
				properties: {
					id: {
						type: 'string',
					},
					email: {
						type: 'string',
					},
					address: {
						type: 'object',
						properties: {
							line1: {
								type: 'string',
							},
							country: {
								type: 'string',
							},
						},
					},
					tags: {
						type: 'array',
						items: { type: 'string' },
					},
					workspaces: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: {
									type: 'string',
								},
								name: {
									type: 'string',
								},
							},
							required: ['gid', 'name', 'resource_type'],
						},
					},
				},
				required: ['gid', 'email', 'name', 'photo', 'resource_type', 'workspaces'],
			};

			expect(getSchemaForJsonSchema(jsonSchema)).toEqual({
				path: '',
				type: 'object',
				value: [
					{
						key: 'id',
						path: '.id',
						type: 'string',
						value: '',
					},
					{
						key: 'email',
						path: '.email',
						type: 'string',
						value: '',
					},
					{
						key: 'address',
						path: '.address',
						type: 'object',
						value: [
							{
								key: 'line1',
								path: '.address.line1',
								type: 'string',
								value: '',
							},
							{
								key: 'country',
								path: '.address.country',
								type: 'string',
								value: '',
							},
						],
					},
					{
						key: 'tags',
						path: '.tags',
						type: 'array',
						value: [
							{
								key: '0',
								path: '.tags[0]',
								type: 'string',
								value: '',
							},
						],
					},
					{
						key: 'workspaces',
						path: '.workspaces',
						type: 'array',
						value: [
							{
								key: '0',
								path: '.workspaces[0]',
								type: 'object',
								value: [
									{
										key: 'id',
										path: '.workspaces[0].id',
										type: 'string',
										value: '',
									},
									{
										key: 'name',
										path: '.workspaces[0].name',
										type: 'string',
										value: '',
									},
								],
							},
						],
					},
				],
			});
		});
	});
});

describe('useFlattenSchema', () => {
	describe('flattenSchema', () => {
		it('flattens a schema', () => {
			const schema: Schema = {
				path: '',
				type: 'object',
				value: [
					{
						key: 'obj',
						path: '.obj',
						type: 'object',
						value: [
							{
								key: 'foo',
								path: '.obj.foo',
								type: 'object',
								value: [
									{
										key: 'nested',
										path: '.obj.foo.nested',
										type: 'string',
										value: 'bar',
									},
								],
							},
						],
					},
				],
			};
			expect(
				useFlattenSchema().flattenSchema({
					schema,
					isDataEmpty: false,
					truncateLimit: 600,
				}).length,
			).toBe(3);
		});

		it('items ids should be unique', () => {
			const { flattenSchema } = useFlattenSchema();
			const schema: Schema = {
				path: '',
				type: 'object',
				value: [
					{
						key: 'index',
						type: 'number',
						value: '0',
						path: '.index',
					},
				],
			};
			const node1Schema = flattenSchema({
				schema,
				expressionPrefix: '$("First Node")',
				depth: 1,
				isDataEmpty: false,
				truncateLimit: 600,
			});
			const node2Schema = flattenSchema({
				schema,
				expressionPrefix: '$("Second Node")',
				depth: 1,
				isDataEmpty: false,
				truncateLimit: 600,
			});

			expect(node1Schema[0].id).not.toBe(node2Schema[0].id);
		});
	});

	describe('flattenMultipleSchemas', () => {
		it('should handle empty data', () => {
			const { flattenMultipleSchemas } = useFlattenSchema();

			const result = flattenMultipleSchemas(
				[
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isDataEmpty: true,
						schema: { type: 'object', value: [] },
					}),
				],
				vi.fn(),
				600,
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(expect.objectContaining({ type: 'header', title: 'Test Node' }));
			expect(result[1]).toEqual(
				expect.objectContaining({ type: 'empty', key: 'emptyData', level: 1 }),
			);
		});

		it('should handle unexecuted nodes', () => {
			const { flattenMultipleSchemas } = useFlattenSchema();

			const result = flattenMultipleSchemas(
				[
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isNodeExecuted: false,
						schema: { type: 'object', value: [] },
					}),
				],
				vi.fn(),
				600,
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(expect.objectContaining({ type: 'header', title: 'Test Node' }));
			expect(result[1]).toEqual(
				expect.objectContaining({ type: 'empty', key: 'executeSchema', level: 1 }),
			);
		});

		it('should handle empty schema', () => {
			const { flattenMultipleSchemas } = useFlattenSchema();

			const result = flattenMultipleSchemas(
				[
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isDataEmpty: false,
						hasBinary: false,
						schema: { type: 'object', value: [] },
					}),
				],
				vi.fn(),
				600,
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(expect.objectContaining({ type: 'header', title: 'Test Node' }));
			expect(result[1]).toEqual(
				expect.objectContaining({ type: 'empty', key: 'emptySchema', level: 1 }),
			);
		});

		it('should handle empty schema with binary', () => {
			const { flattenMultipleSchemas } = useFlattenSchema();

			const result = flattenMultipleSchemas(
				[
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isDataEmpty: false,
						hasBinary: true,
						schema: { type: 'object', value: [] },
					}),
				],
				vi.fn(),
				600,
			);
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(expect.objectContaining({ type: 'header', title: 'Test Node' }));
			expect(result[1]).toEqual(
				expect.objectContaining({ type: 'empty', key: 'emptySchemaWithBinary', level: 1 }),
			);
		});

		it('should flatten node schemas', () => {
			const { flattenMultipleSchemas } = useFlattenSchema();
			const schema: Schema = {
				path: '',
				type: 'object',
				value: [
					{
						key: 'obj',
						path: '.obj',
						type: 'object',
						value: [
							{
								key: 'foo',
								path: '.obj.foo',
								type: 'object',
								value: [
									{
										key: 'nested',
										path: '.obj.foo.nested',
										type: 'string',
										value: 'bar',
									},
								],
							},
						],
					},
				],
			};

			const result = flattenMultipleSchemas(
				[
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isDataEmpty: false,
						hasBinary: false,
						preview: false,
						schema,
					}),
					mock<SchemaNode>({
						node: { name: 'Test Node' },
						isDataEmpty: false,
						hasBinary: false,
						preview: false,
						schema,
					}),
				],
				vi.fn(),
				600,
			);
			expect(result).toHaveLength(10);
			expect(result.filter((item) => item.type === 'header')).toHaveLength(2);
			expect(result.filter((item) => item.type === 'item')).toHaveLength(8);
			expect(result).toMatchSnapshot();
		});
	});
});
