import toPlainObject from 'lodash/toPlainObject';
import { DateTime } from 'luxon';
import type { IDataObject, INode, INodeType, NodeParameterValue } from 'n8n-workflow';
import { ExpressionError } from 'n8n-workflow';

import { cleanupParameterData, ensureType, validateValueAgainstSchema } from '../utils';

describe('cleanupParameterData', () => {
	it('should stringify Luxon dates in-place', () => {
		const input = { x: 1, y: DateTime.now() as unknown as NodeParameterValue };
		expect(typeof input.y).toBe('object');
		cleanupParameterData(input);
		expect(typeof input.y).toBe('string');
	});

	it('should stringify plain Luxon dates in-place', () => {
		const input = {
			x: 1,
			y: toPlainObject(DateTime.now()),
		};
		expect(typeof input.y).toBe('object');
		cleanupParameterData(input);
		expect(typeof input.y).toBe('string');
	});

	it('should handle objects with nameless constructors', () => {
		const input = { x: 1, y: { constructor: {} } as NodeParameterValue };
		expect(typeof input.y).toBe('object');
		cleanupParameterData(input);
		expect(typeof input.y).toBe('object');
	});

	it('should handle objects without a constructor', () => {
		const input = { x: 1, y: { constructor: undefined } as unknown as NodeParameterValue };
		expect(typeof input.y).toBe('object');
		cleanupParameterData(input);
		expect(typeof input.y).toBe('object');
	});
});

describe('ensureType', () => {
	it('throws error for null value', () => {
		expect(() => ensureType('string', null, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must not be null"),
		);
	});

	it('throws error for undefined value', () => {
		expect(() => ensureType('string', undefined, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' could not be 'undefined'"),
		);
	});

	it('returns string value without modification', () => {
		const value = 'hello';
		const expectedValue = value;
		const result = ensureType('string', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('returns number value without modification', () => {
		const value = 42;
		const expectedValue = value;
		const result = ensureType('number', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('returns boolean value without modification', () => {
		const value = true;
		const expectedValue = value;
		const result = ensureType('boolean', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('converts object to string if toType is string', () => {
		const value = { name: 'John' };
		const expectedValue = JSON.stringify(value);
		const result = ensureType('string', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('converts string to number if toType is number', () => {
		const value = '10';
		const expectedValue = 10;
		const result = ensureType('number', value, 'myParam');
		expect(result).toBe(expectedValue);
	});

	it('throws error for invalid conversion to number', () => {
		const value = 'invalid';
		expect(() => ensureType('number', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must be a number, but we got 'invalid'"),
		);
	});

	it('parses valid JSON string to object if toType is object', () => {
		const value = '{"name": "Alice"}';
		const expectedValue = JSON.parse(value);
		const result = ensureType('object', value, 'myParam');
		expect(result).toEqual(expectedValue);
	});

	it('throws error for invalid JSON string to object conversion', () => {
		const value = 'invalid_json';
		expect(() => ensureType('object', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' could not be parsed"),
		);
	});

	it('throws error for non-array value if toType is array', () => {
		const value = { name: 'Alice' };
		expect(() => ensureType('array', value, 'myParam')).toThrowError(
			new ExpressionError("Parameter 'myParam' must be an array, but we got object"),
		);
	});
});

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
});
