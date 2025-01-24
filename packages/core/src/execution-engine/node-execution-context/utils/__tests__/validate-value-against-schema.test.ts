import type { IDataObject, INode, INodeType } from 'n8n-workflow';

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

	describe('when the mode is in Fixed mode, and the node is a resource mapper', () => {
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
});
