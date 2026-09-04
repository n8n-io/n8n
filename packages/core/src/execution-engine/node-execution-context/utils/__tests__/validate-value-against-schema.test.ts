import { ExpressionError, type IDataObject, type INode, type INodeType } from 'n8n-workflow';

import { validateValueAgainstSchema } from '../validate-value-against-schema';

describe('validateValueAgainstSchema', () => {
	test('should validate fixedCollection values parameter', () => {
		const nodeType = {
			description: {
				properties: [
					{
						displayName: 'Fields to Set',
						name: 'fields',
						placeholder: 'Add Field',
						type: 'fixedCollection',
						description: 'Edit existing fields or add new ones to modify the output data',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						default: {},
						options: [
							{
								name: 'values',
								displayName: 'Values',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										placeholder: 'e.g. fieldName',
										description:
											'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.',
										requiresDataPath: 'single',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										description: 'The field value type',
										options: [
											{
												name: 'String',
												value: 'stringValue',
											},
											{
												name: 'Number',
												value: 'numberValue',
											},
											{
												name: 'Boolean',
												value: 'booleanValue',
											},
											{
												name: 'Array',
												value: 'arrayValue',
											},
											{
												name: 'Object',
												value: 'objectValue',
											},
										],
										default: 'stringValue',
									},
									{
										displayName: 'Value',
										name: 'stringValue',
										type: 'string',
										default: '',
										displayOptions: {
											show: {
												type: ['stringValue'],
											},
										},
										validateType: 'string',
									},
									{
										displayName: 'Value',
										name: 'numberValue',
										type: 'number',
										default: 0,
										displayOptions: {
											show: {
												type: ['numberValue'],
											},
										},
										validateType: 'number',
									},
									{
										displayName: 'Value',
										name: 'booleanValue',
										type: 'options',
										default: 'true',
										options: [
											{
												name: 'True',
												value: 'true',
											},
											{
												name: 'False',
												value: 'false',
											},
										],
										displayOptions: {
											show: {
												type: ['booleanValue'],
											},
										},
										validateType: 'boolean',
									},
									{
										displayName: 'Value',
										name: 'arrayValue',
										type: 'string',
										default: '',
										placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
										displayOptions: {
											show: {
												type: ['arrayValue'],
											},
										},
										validateType: 'array',
									},
									{
										displayName: 'Value',
										name: 'objectValue',
										type: 'json',
										default: '={}',
										typeOptions: {
											rows: 2,
										},
										displayOptions: {
											show: {
												type: ['objectValue'],
											},
										},
										validateType: 'object',
									},
								],
							},
						],
						displayOptions: {
							show: {
								mode: ['manual'],
							},
						},
					},
				],
			},
		} as unknown as INodeType;

		const node = {
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				fields: {
					values: [
						{
							name: 'num1',
							type: 'numberValue',
							numberValue: '=str',
						},
					],
				},
				include: 'none',
				options: {},
			},
			name: 'Edit Fields2',
			type: 'n8n-nodes-base.set',
			typeVersion: 3,
		} as unknown as INode;

		const values = [
			{
				name: 'num1',
				type: 'numberValue',
				numberValue: '55',
			},
			{
				name: 'str1',
				type: 'stringValue',
				stringValue: 42, //validateFieldType does not change the type of string value
			},
			{
				name: 'arr1',
				type: 'arrayValue',
				arrayValue: "['foo', 'bar']",
			},
			{
				name: 'obj',
				type: 'objectValue',
				objectValue: '{ "key": "value" }',
			},
		];

		const parameterName = 'fields.values';

		const result = validateValueAgainstSchema(node, nodeType, values, parameterName, 0, 0);

		// value should be type number
		expect(typeof (result as IDataObject[])[0].numberValue).toEqual('number');
		// string value should remain unchanged
		expect(typeof (result as IDataObject[])[1].stringValue).toEqual('number');
		// value should be type array
		expect(typeof (result as IDataObject[])[2].arrayValue).toEqual('object');
		expect(Array.isArray((result as IDataObject[])[2].arrayValue)).toEqual(true);
		// value should be type object
		expect(typeof (result as IDataObject[])[3].objectValue).toEqual('object');
		expect(((result as IDataObject[])[3].objectValue as IDataObject).key).toEqual('value');
	});

	test('should validate single value parameter', () => {
		const nodeType = {
			description: {
				properties: [
					{
						displayName: 'Value',
						name: 'numberValue',
						type: 'number',
						default: 0,
						validateType: 'number',
					},
				],
			},
		} as unknown as INodeType;

		const node = {
			parameters: {
				mode: 'manual',
				duplicateItem: false,
				numberValue: '777',
				include: 'none',
				options: {},
			},
			name: 'Edit Fields2',
			type: 'n8n-nodes-base.set',
			typeVersion: 3,
		} as unknown as INode;

		const value = '777';

		const parameterName = 'numberValue';

		const result = validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0);

		// value should be type number
		expect(typeof result).toEqual('number');
	});

	describe('when validating a resource mapper value', () => {
		describe('when attemptToConvertTypes === true', () => {
			const nodeType = {
				description: {
					properties: [
						{
							name: 'operation',
							type: 'resourceMapper',
							typeOptions: {
								resourceMapper: {
									mode: 'add',
								},
							},
						},
					],
				},
			} as unknown as INodeType;

			const node = {
				parameters: {
					operation: {
						schema: [
							{ id: 'num', type: 'number', required: true },
							{ id: 'str', type: 'string', required: true },
							{ id: 'obj', type: 'object', required: true },
							{ id: 'arr', type: 'array', required: true },
						],
						attemptToConvertTypes: true,
						mappingMode: '',
						value: '',
					},
				},
			} as unknown as INode;

			const parameterName = 'operation.value';

			describe('should correctly validate values for', () => {
				test.each([
					{ num: 0 },
					{ num: 23 },
					{ num: -0 },
					{ num: -Infinity },
					{ num: Infinity },
					{ str: '' },
					{ str: ' ' },
					{ str: 'hello' },
					{ arr: [] },
					{ obj: {} },
				])('%s', (value) => {
					expect(() =>
						validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0),
					).not.toThrow();
				});
			});

			describe('should throw an error for', () => {
				test.each([{ num: NaN }, { num: undefined }, { num: null }])('%s', (value) => {
					expect(() =>
						validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0),
					).toThrow();
				});
			});
		});

		describe('when showTypeConversionOptions is not set (=default)', () => {
			test('should correctly convert types', () => {
				const nodeType = {
					description: {
						properties: [
							{
								displayName: 'Columns',
								name: 'columns',
								type: 'resourceMapper',
								required: true,
								typeOptions: {
									loadOptionsDependsOn: ['table.value', 'operation'],
									resourceMapper: {
										mode: 'upsert',
									},
								},
							},
						],
					},
				} as unknown as INodeType;

				const node: INode = {
					parameters: {
						columns: {
							mappingMode: 'defineBelow',
							value: {
								id: 2,
								count: '={{ $json.count }}',
							},
							matchingColumns: ['id'],
							attemptToConvertTypes: false,
							convertFieldsToString: true,
							schema: [
								{
									id: 'id',
									displayName: 'id',
									required: false,
									defaultMatch: true,
									display: true,
									type: 'number',
									canBeUsedToMatch: true,
								},
								{
									id: 'count',
									displayName: 'count',
									required: false,
									defaultMatch: false,
									display: true,
									type: 'number',
									canBeUsedToMatch: false,
								},
							],
						},
						options: {},
					},
					id: '8d6cec63-8db1-440c-8966-4d6311ee69a9',
					name: 'add products to DB',
					type: 'n8n-nodes-base.postgres',
					typeVersion: 2.3,
					position: [420, 0],
				};

				const value = {
					id: 2,
					count: '23',
				};

				const parameterName = 'columns.value';

				const result = validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0);

				expect(result).toEqual({
					id: 2,
					count: 23,
				});
			});
		});

		describe('when showTypeConversionOptions is true', () => {
			test('should throw an error', () => {
				const nodeType = {
					description: {
						properties: [
							{
								displayName: 'Columns',
								name: 'columns',
								type: 'resourceMapper',
								noDataExpression: true,
								typeOptions: {
									resourceMapper: {
										showTypeConversionOptions: true,
										mode: 'upsert',
									},
								},
							},
						],
					},
				} as unknown as INodeType;

				const node: INode = {
					parameters: {
						columns: {
							mappingMode: 'defineBelow',
							value: {
								id: 2,
								count: '={{ $json.count }}',
							},
							matchingColumns: ['id'],
							schema: [
								{
									id: 'id',
									displayName: 'id',
									required: false,
									defaultMatch: true,
									display: true,
									type: 'number',
									canBeUsedToMatch: true,
								},
								{
									id: 'count',
									displayName: 'count',
									required: false,
									defaultMatch: false,
									display: true,
									type: 'number',
									canBeUsedToMatch: false,
								},
							],
						},
						options: {},
					},
					id: '8d6cec63-8db1-440c-8966-4d6311ee69a9',
					name: 'add products to DB',
					type: 'n8n-nodes-base.postgres',
					typeVersion: 2.3,
					position: [420, 0],
				};

				const value = {
					id: 2,
					count: '23',
				};

				const parameterName = 'columns.value';

				expect(() =>
					validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0),
				).toThrow(ExpressionError);
				expect(() =>
					validateValueAgainstSchema(node, nodeType, value, parameterName, 0, 0),
				).toThrow("Invalid input for 'count' [item 0]");
			});
		});

		describe('convertFieldsToString across the 1.4 boundary', () => {
			const nodeType = {
				description: {
					properties: [
						{
							displayName: 'Workflow Inputs',
							name: 'workflowInputs',
							type: 'resourceMapper',
							noDataExpression: true,
							typeOptions: {
								resourceMapper: { showTypeConversionOptions: true, mode: 'map' },
							},
						},
					],
				},
			} as unknown as INodeType;

			const makeNode = (typeVersion: number, flags: Record<string, unknown>): INode =>
				({
					parameters: {
						workflowInputs: {
							mappingMode: 'defineBelow',
							value: { note: '={{ $json.note }}' },
							matchingColumns: [],
							...flags,
							schema: [
								{
									id: 'note',
									displayName: 'note',
									required: false,
									defaultMatch: false,
									display: true,
									type: 'string',
									canBeUsedToMatch: true,
								},
							],
						},
						options: {},
					},
					id: '8d6cec63-8db1-440c-8966-4d6311ee69a9',
					name: 'call sub-workflow',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion,
					position: [420, 0],
				}) as unknown as INode;

			const run = (typeVersion: number, flags: Record<string, unknown>) =>
				validateValueAgainstSchema(
					makeNode(typeVersion, flags),
					nodeType,
					{ note: 42 },
					'workflowInputs.value',
					0,
					0,
				);

			describe.each([1.2, 1.3])('on v%s the stored flag still decides', (typeVersion) => {
				// Anything authored outside the NDV can omit the flag, so these two must keep
				// passing values through untouched rather than starting to reject them.
				test('passes the value through when the flag is absent', () => {
					expect(run(typeVersion, { attemptToConvertTypes: false })).toEqual({ note: 42 });
				});

				test('passes the value through when the flag is false', () => {
					expect(
						run(typeVersion, { attemptToConvertTypes: false, convertFieldsToString: false }),
					).toEqual({ note: 42 });
				});

				test('rejects a type mismatch when the flag is true', () => {
					expect(() =>
						run(typeVersion, { attemptToConvertTypes: false, convertFieldsToString: true }),
					).toThrow(ExpressionError);
				});
			});

			describe('on v1.4 the stored flag is ignored', () => {
				test('casts to string even when the flag is false', () => {
					expect(run(1.4, { attemptToConvertTypes: true, convertFieldsToString: false })).toEqual({
						note: '42',
					});
				});

				test('casts to string when the flag is absent', () => {
					expect(run(1.4, { attemptToConvertTypes: true })).toEqual({ note: '42' });
				});

				test('rejects a type mismatch when conversion is off, whatever the flag says', () => {
					expect(() =>
						run(1.4, { attemptToConvertTypes: false, convertFieldsToString: false }),
					).toThrow(ExpressionError);
				});
			});
		});

		describe('schema field lookup', () => {
			const nodeType = {
				description: {
					properties: [
						{
							displayName: 'Columns',
							name: 'columns',
							type: 'resourceMapper',
							typeOptions: {
								resourceMapper: {
									mode: 'add',
								},
							},
						},
					],
				},
			} as unknown as INodeType;

			const schemaField = (id: string, type: string, required = false) => ({
				id,
				displayName: id,
				required,
				defaultMatch: false,
				display: true,
				type,
				canBeUsedToMatch: false,
			});

			const makeNode = (schema: unknown[], value: IDataObject) =>
				({
					parameters: {
						columns: {
							mappingMode: 'defineBelow',
							value,
							matchingColumns: [],
							attemptToConvertTypes: false,
							schema,
						},
						options: {},
					},
					id: '8d6cec63-8db1-440c-8966-4d6311ee69a9',
					name: 'add products to DB',
					type: 'n8n-nodes-base.postgres',
					typeVersion: 2.3,
					position: [420, 0],
				}) as unknown as INode;

			const parameterName = 'columns.value';

			test('resolves every value against its own schema entry, whatever its position', () => {
				const schema = [
					schemaField('a', 'number'),
					schemaField('b', 'string'),
					schemaField('c', 'number'),
					schemaField('d', 'boolean'),
				];
				const value = { d: 'true', c: '3', b: 2, a: '1' };

				const result = validateValueAgainstSchema(
					makeNode(schema, value),
					nodeType,
					value,
					parameterName,
					0,
					0,
				);

				// `a`, `c` and `d` are cast to their schema type; `b` keeps its type, as
				// validateFieldType does not coerce values for string fields.
				expect(result).toEqual({ a: 1, b: 2, c: 3, d: true });
			});

			test('uses the first entry when a field id appears twice, like Array.prototype.find', () => {
				const schema = [schemaField('dup', 'number'), schemaField('dup', 'string')];
				const value = { dup: '42' };

				const result = validateValueAgainstSchema(
					makeNode(schema, value),
					nodeType,
					value,
					parameterName,
					0,
					0,
				);

				// The first entry types `dup` as a number, so the string is cast. Had the second
				// (string) entry won, the value would have stayed '42'.
				expect(result).toEqual({ dup: 42 });
			});

			test('leaves values that have no schema entry untouched', () => {
				const schema = [schemaField('known', 'number')];
				const value = { known: '7', unknown: 'abc' };

				const result = validateValueAgainstSchema(
					makeNode(schema, value),
					nodeType,
					value,
					parameterName,
					0,
					0,
				);

				expect(result).toEqual({ known: 7, unknown: 'abc' });
			});

			// `isResourceMapperValue` only checks that `schema` is present, so a persisted
			// `schema: null` reaches the lookup. Indexing now runs before the loop, where the
			// previous `schema.find` only ran inside it — an empty value never touched it.
			describe.each([
				['null', null],
				['undefined', undefined],
				['empty', []],
			])('when the stored schema is %s', (_label, schema) => {
				test('resolves no field instead of throwing', () => {
					const value = { anything: 'kept' };

					const result = validateValueAgainstSchema(
						makeNode(schema as unknown as unknown[], value),
						nodeType,
						value,
						parameterName,
						0,
						0,
					);

					expect(result).toEqual({ anything: 'kept' });
				});
			});
		});
	});
});
