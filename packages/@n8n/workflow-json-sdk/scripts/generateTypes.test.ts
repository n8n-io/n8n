import { describe, it, expect } from 'vitest';

import type { NodeProperty, NodeTypeDefinition } from './generateTypes';
import {
	toPascalCase,
	toValidPropertyName,
	getDefaultType,
	getTypeScriptType,
	generateNodeParametersInterface,
	generateOperationTypes,
	convertNodeToTypes,
} from './generateTypes';

describe('generateTypes', () => {
	describe('toPascalCase', () => {
		it('should convert kebab-case to PascalCase', () => {
			expect(toPascalCase('action-network')).toEqual('ActionNetwork');
			expect(toPascalCase('http-request')).toEqual('HttpRequest');
		});

		it('should convert snake_case to PascalCase', () => {
			expect(toPascalCase('action_network')).toEqual('ActionNetwork');
			expect(toPascalCase('http_request')).toEqual('HttpRequest');
		});

		it('should convert dot.case to PascalCase', () => {
			expect(toPascalCase('n8n-nodes-base.actionNetwork')).toEqual('N8nNodesBaseActionNetwork');
		});

		it('should handle mixed case conversions', () => {
			expect(toPascalCase('my-awesome_node.test')).toEqual('MyAwesomeNodeTest');
		});

		it('should handle single words', () => {
			expect(toPascalCase('node')).toEqual('Node');
			expect(toPascalCase('NODE')).toEqual('NODE');
		});

		it('should handle empty strings', () => {
			expect(toPascalCase('')).toEqual('');
		});
	});

	describe('toValidPropertyName', () => {
		it('should return valid identifiers as-is', () => {
			expect(toValidPropertyName('name')).toEqual('name');
			expect(toValidPropertyName('userName')).toEqual('userName');
			expect(toValidPropertyName('_private')).toEqual('_private');
			expect(toValidPropertyName('$value')).toEqual('$value');
		});

		it('should wrap names with special characters in quotes', () => {
			expect(toValidPropertyName('my-property')).toEqual('"my-property"');
			expect(toValidPropertyName('user.name')).toEqual('"user.name"');
			expect(toValidPropertyName('prop@name')).toEqual('"prop@name"');
		});

		it('should wrap names with spaces in quotes', () => {
			expect(toValidPropertyName('my property')).toEqual('"my property"');
		});

		it('should handle alphanumeric with underscores', () => {
			expect(toValidPropertyName('prop_123')).toEqual('prop_123');
		});
	});

	describe('getDefaultType', () => {
		it('should return "any" for null and undefined', () => {
			expect(getDefaultType(null)).toEqual('any');
			expect(getDefaultType(undefined)).toEqual('any');
		});

		it('should return primitive types', () => {
			expect(getDefaultType('test')).toEqual('string');
			expect(getDefaultType(123)).toEqual('number');
			expect(getDefaultType(true)).toEqual('boolean');
		});

		it('should return "any[]" for arrays', () => {
			expect(getDefaultType([])).toEqual('any[]');
			expect(getDefaultType([1, 2, 3])).toEqual('any[]');
		});

		it('should return "Record<string, any>" for objects', () => {
			expect(getDefaultType({})).toEqual('Record<string, any>');
			expect(getDefaultType({ key: 'value' })).toEqual('Record<string, any>');
		});
	});

	describe('getTypeScriptType', () => {
		it('should return string for string type', () => {
			const prop: NodeProperty = {
				displayName: 'Name',
				name: 'name',
				type: 'string',
			};
			expect(getTypeScriptType(prop)).toEqual('string');
		});

		it('should return number for number type', () => {
			const prop: NodeProperty = {
				displayName: 'Count',
				name: 'count',
				type: 'number',
			};
			expect(getTypeScriptType(prop)).toEqual('number');
		});

		it('should return boolean for boolean type', () => {
			const prop: NodeProperty = {
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
			};
			expect(getTypeScriptType(prop)).toEqual('boolean');
		});

		it('should return "string | Date" for dateTime type', () => {
			const prop: NodeProperty = {
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
			};
			expect(getTypeScriptType(prop)).toEqual('string | Date');
		});

		it('should return union of option values for options type', () => {
			const prop: NodeProperty = {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Post', value: 'post' },
				],
			};
			expect(getTypeScriptType(prop)).toEqual('"user" | "post"');
		});

		it('should return string for options type without options', () => {
			const prop: NodeProperty = {
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
			};
			expect(getTypeScriptType(prop)).toEqual('string');
		});

		it('should return array of option values for multiOptions type', () => {
			const prop: NodeProperty = {
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				options: [
					{ name: 'Tag 1', value: 'tag1' },
					{ name: 'Tag 2', value: 'tag2' },
				],
			};
			expect(getTypeScriptType(prop)).toEqual('Array<"tag1" | "tag2">');
		});

		it('should return string[] for multiOptions type without options', () => {
			const prop: NodeProperty = {
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
			};
			expect(getTypeScriptType(prop)).toEqual('string[]');
		});

		it('should return "Record<string, any>" for collection type without options', () => {
			const prop: NodeProperty = {
				displayName: 'Data',
				name: 'data',
				type: 'collection',
			};
			expect(getTypeScriptType(prop)).toEqual('Record<string, any>');
		});

		it('should generate typed collection with options', () => {
			const prop: NodeProperty = {
				displayName: 'Data',
				name: 'data',
				type: 'collection',
				options: [
					{ name: 'Field 1', value: 'field1', description: 'First field' },
					{ name: 'Field 2', value: 'field2' },
				],
			};
			const result = getTypeScriptType(prop);
			expect(result).toEqual(`{
  /** First field */
  field1?: any;
  field2?: any;
}`);
		});

		it('should return "Record<string, any>" for fixedCollection type without options', () => {
			const prop: NodeProperty = {
				displayName: 'Fields',
				name: 'fields',
				type: 'fixedCollection',
			};
			expect(getTypeScriptType(prop)).toEqual('Record<string, any>');
		});

		it('should generate typed fixedCollection with nested values', () => {
			const prop: NodeProperty = {
				displayName: 'Email Addresses',
				name: 'email_addresses',
				type: 'fixedCollection',
				options: [
					{
						name: 'Email Address Fields',
						value: 'email_addresses_fields',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: false,
							},
						],
					},
				],
			};
			const result = getTypeScriptType(prop);
			expect(result).toEqual(`{
  "email_addresses_fields"?: {
    address?: string;
    primary?: boolean;
  };
}`);
		});

		it('should handle fixedCollection with multipleValues', () => {
			const prop: NodeProperty = {
				displayName: 'Postal Addresses',
				name: 'postal_addresses',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'Address Fields',
						value: 'address_fields',
						values: [
							{
								displayName: 'Street',
								name: 'street',
								type: 'string',
								default: '',
							},
						],
					},
				],
			};
			const result = getTypeScriptType(prop);
			expect(result).toEqual(`{
  "address_fields"?: Array<{
    street?: string;
  }>;
}`);
		});

		it('should handle multipleValues typeOption for string types', () => {
			const prop: NodeProperty = {
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
			};
			expect(getTypeScriptType(prop)).toEqual('Array<string>');
		});

		it('should return "string | object" for json type', () => {
			const prop: NodeProperty = {
				displayName: 'JSON',
				name: 'json',
				type: 'json',
			};
			expect(getTypeScriptType(prop)).toEqual('string | object');
		});

		it('should return type based on default value for hidden type', () => {
			const prop: NodeProperty = {
				displayName: 'Hidden',
				name: 'hidden',
				type: 'hidden',
				default: 'test',
			};
			expect(getTypeScriptType(prop)).toEqual('string');
		});

		it('should return "any" for unknown types', () => {
			const prop: NodeProperty = {
				displayName: 'Unknown',
				name: 'unknown',
				type: 'unknownType',
			};
			expect(getTypeScriptType(prop)).toEqual('any');
		});
	});

	describe('generateNodeParametersInterface', () => {
		it('should generate simple interface with basic properties', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 0,
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			expect(result).toEqual(`export interface TestNodeParameters {

  name?: string;

  count?: number;
}`);
		});

		it('should mark required properties without optional marker', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Required Field',
						name: 'required',
						type: 'string',
						required: true,
					},
					{
						displayName: 'Optional Field',
						name: 'optional',
						type: 'string',
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			expect(result).toEqual(`export interface TestNodeParameters {

  required: string;

  optional?: string;
}`);
		});

		it('should include property descriptions as comments', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						description: 'The name of the resource',
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			expect(result).toEqual(`export interface TestNodeParameters {

  /** The name of the resource */
  name?: string;
}`);
		});

		it('should handle conditional properties with display options', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [{ name: 'User', value: 'user' }],
					},
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'string',
						displayOptions: {
							show: {
								resource: ['user'],
							},
						},
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			expect(result).toEqual(`export interface TestNodeParameters {

  resource?: "user";

  // Properties shown when: resource: user

  userId?: string;
}`);
		});

		it('should handle multiple display conditions', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						displayOptions: {
							show: {
								resource: ['user'],
								operation: ['get'],
							},
						},
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			// Note: The order of conditions may vary, so we check both possibilities
			const expectedOption1 = `export interface TestNodeParameters {

  // Properties shown when: resource: user AND operation: get

  field?: string;
}`;
			const expectedOption2 = `export interface TestNodeParameters {

  // Properties shown when: operation: get AND resource: user

  field?: string;
}`;

			expect([expectedOption1, expectedOption2]).toContainEqual(result);
		});

		it('should quote property names with special characters', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Special Property',
						name: 'my-special-property',
						type: 'string',
					},
				],
			};

			const result = generateNodeParametersInterface(node);

			expect(result).toEqual(`export interface TestNodeParameters {

  "my-special-property"?: string;
}`);
		});
	});

	describe('generateOperationTypes', () => {
		it('should return empty array if no resource property', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [],
			};

			const result = generateOperationTypes(node);

			expect(result).toEqual([]);
		});

		it('should return empty array if no operation property', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [{ name: 'User', value: 'user' }],
					},
				],
			};

			const result = generateOperationTypes(node);

			expect(result).toEqual([]);
		});

		it('should generate operation-specific types', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [{ name: 'User', value: 'user' }],
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Get', value: 'get' }],
					},
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'string',
						displayOptions: {
							show: {
								resource: ['user'],
								operation: ['get'],
							},
						},
					},
				],
			};

			const result = generateOperationTypes(node);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(`export interface TestNodeUserGetParameters {
  resource: "user";
  operation: "get";

  userId?: string;
}`);
		});

		it('should handle multiple resources and operations', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [
							{ name: 'User', value: 'user' },
							{ name: 'Post', value: 'post' },
						],
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Get', value: 'get' },
							{ name: 'Create', value: 'create' },
						],
					},
					{
						displayName: 'User ID',
						name: 'userId',
						type: 'string',
						displayOptions: {
							show: {
								resource: ['user'],
								operation: ['get'],
							},
						},
					},
					{
						displayName: 'Post ID',
						name: 'postId',
						type: 'string',
						displayOptions: {
							show: {
								resource: ['post'],
								operation: ['get'],
							},
						},
					},
				],
			};

			const result = generateOperationTypes(node);

			expect(result.length).toBeGreaterThan(0);
			expect(result.some((type) => type.includes('TestNodeUserGetParameters'))).toBe(true);
			expect(result.some((type) => type.includes('TestNodePostGetParameters'))).toBe(true);
		});

		it('should not generate types for operations without properties', () => {
			const node: NodeTypeDefinition = {
				displayName: 'Test Node',
				name: 'n8n-nodes-base.testNode',
				properties: [
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						options: [{ name: 'User', value: 'user' }],
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Get', value: 'get' }],
					},
				],
			};

			const result = generateOperationTypes(node);

			expect(result).toEqual([]);
		});
	});

	describe('convertNodeToTypes', () => {
		it('should generate complete type definitions for a node', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Action Network',
					name: 'n8n-nodes-base.actionNetwork',
					properties: [
						{
							displayName: 'Resource',
							name: 'resource',
							type: 'options',
							default: 'attendance',
							options: [
								{ name: 'Attendance', value: 'attendance' },
								{ name: 'Event', value: 'event' },
							],
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							default: 'create',
							options: [
								{ name: 'Create', value: 'create' },
								{ name: 'Get', value: 'get' },
							],
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Action Network
// Node: n8n-nodes-base.actionNetwork

export interface ActionNetworkParameters {

  resource?: "attendance" | "event";

  operation?: "create" | "get";
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.actionNetwork": ActionNetworkParameters;
}
`);
		});

		it('should handle multiple nodes', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Node 1',
					name: 'n8n-nodes-base.node1',
					properties: [
						{
							displayName: 'Field 1',
							name: 'field1',
							type: 'string',
						},
					],
				},
				{
					displayName: 'Node 2',
					name: 'n8n-nodes-base.node2',
					properties: [
						{
							displayName: 'Field 2',
							name: 'field2',
							type: 'number',
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Node 1
// Node: n8n-nodes-base.node1

export interface Node1Parameters {

  field1?: string;
}

// ---

// Node 2
// Node: n8n-nodes-base.node2

export interface Node2Parameters {

  field2?: number;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.node1": Node1Parameters;
  "n8n-nodes-base.node2": Node2Parameters;
}
`);
		});

		it('should include operation-specific types when available', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Test Node',
					name: 'n8n-nodes-base.testNode',
					properties: [
						{
							displayName: 'Resource',
							name: 'resource',
							type: 'options',
							options: [{ name: 'User', value: 'user' }],
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [{ name: 'Get', value: 'get' }],
						},
						{
							displayName: 'User ID',
							name: 'userId',
							type: 'string',
							displayOptions: {
								show: {
									resource: ['user'],
									operation: ['get'],
								},
							},
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Test Node
// Node: n8n-nodes-base.testNode

export interface TestNodeParameters {

  resource?: "user";

  operation?: "get";

  // Properties shown when: resource: user AND operation: get

  userId?: string;
}

// Operation-specific parameter types
export interface TestNodeUserGetParameters {
  resource: "user";
  operation: "get";

  userId?: string;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.testNode": TestNodeParameters;
}
`);
		});

		it('should handle empty node array', () => {
			const result = convertNodeToTypes([]);

			expect(result).toEqual('// Auto-generated n8n Node Parameter Types\n\n');
		});

		it('should generate NodeTypeToParametersMap for single node', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Test Node',
					name: 'n8n-nodes-base.testNode',
					properties: [
						{
							displayName: 'Field',
							name: 'field',
							type: 'string',
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Test Node
// Node: n8n-nodes-base.testNode

export interface TestNodeParameters {

  field?: string;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.testNode": TestNodeParameters;
}
`);
		});

		it('should generate NodeTypeToParametersMap for multiple nodes', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Node 1',
					name: 'n8n-nodes-base.node1',
					properties: [
						{
							displayName: 'Field 1',
							name: 'field1',
							type: 'string',
						},
					],
				},
				{
					displayName: 'Node 2',
					name: 'n8n-nodes-base.node2',
					properties: [
						{
							displayName: 'Field 2',
							name: 'field2',
							type: 'number',
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Node 1
// Node: n8n-nodes-base.node1

export interface Node1Parameters {

  field1?: string;
}

// ---

// Node 2
// Node: n8n-nodes-base.node2

export interface Node2Parameters {

  field2?: number;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.node1": Node1Parameters;
  "n8n-nodes-base.node2": Node2Parameters;
}
`);
		});
	});

	describe('Integration tests', () => {
		it('should generate correct types for Action Network example', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Action Network',
					name: 'n8n-nodes-base.actionNetwork',
					properties: [
						{
							displayName: 'Resource',
							name: 'resource',
							type: 'options',
							default: 'attendance',
							options: [
								{ name: 'Attendance', value: 'attendance' },
								{ name: 'Event', value: 'event' },
							],
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							default: 'create',
							options: [
								{ name: 'Create', value: 'create' },
								{ name: 'Get', value: 'get' },
							],
							displayOptions: {
								show: { resource: ['attendance'] },
							},
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Action Network
// Node: n8n-nodes-base.actionNetwork

export interface ActionNetworkParameters {

  resource?: "attendance" | "event";

  // Properties shown when: resource: attendance

  operation?: "create" | "get";
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.actionNetwork": ActionNetworkParameters;
}
`);
		});

		it('should handle complex node with all property types', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Complex Node',
					name: 'n8n-nodes-base.complexNode',
					properties: [
						{
							displayName: 'String Field',
							name: 'stringField',
							type: 'string',
							description: 'A string field',
							required: true,
						},
						{
							displayName: 'Number Field',
							name: 'numberField',
							type: 'number',
						},
						{
							displayName: 'Boolean Field',
							name: 'booleanField',
							type: 'boolean',
						},
						{
							displayName: 'Date Field',
							name: 'dateField',
							type: 'dateTime',
						},
						{
							displayName: 'Options Field',
							name: 'optionsField',
							type: 'options',
							options: [
								{ name: 'Option 1', value: 'opt1' },
								{ name: 'Option 2', value: 'opt2' },
							],
						},
						{
							displayName: 'Multi Options',
							name: 'multiOptions',
							type: 'multiOptions',
							options: [
								{ name: 'Tag 1', value: 'tag1' },
								{ name: 'Tag 2', value: 'tag2' },
							],
						},
						{
							displayName: 'JSON Field',
							name: 'jsonField',
							type: 'json',
						},
						{
							displayName: 'Collection',
							name: 'collection',
							type: 'collection',
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Complex Node
// Node: n8n-nodes-base.complexNode

export interface ComplexNodeParameters {

  /** A string field */
  stringField: string;

  numberField?: number;

  booleanField?: boolean;

  dateField?: string | Date;

  optionsField?: "opt1" | "opt2";

  multiOptions?: Array<"tag1" | "tag2">;

  jsonField?: string | object;

  collection?: Record<string, any>;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.complexNode": ComplexNodeParameters;
}
`);
		});

		it('should handle fixedCollection types with proper nesting', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Complex Node',
					name: 'n8n-nodes-base.complexNode',
					properties: [
						{
							displayName: 'Email Addresses',
							name: 'email_addresses',
							type: 'fixedCollection',
							options: [
								{
									name: 'Email Fields',
									value: 'email_fields',
									values: [
										{
											displayName: 'Address',
											name: 'address',
											type: 'string',
											default: '',
											description: 'Email address',
										},
										{
											displayName: 'Primary',
											name: 'primary',
											type: 'boolean',
											default: true,
										},
									],
								},
							],
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Complex Node
// Node: n8n-nodes-base.complexNode

export interface ComplexNodeParameters {

  email_addresses?: {
  "email_fields"?: {
    /** Email address */
    address?: string;
    primary?: boolean;
  };
};
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.complexNode": ComplexNodeParameters;
}
`);
		});

		it('should handle collection with nested options', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Test Node',
					name: 'n8n-nodes-base.testNode',
					properties: [
						{
							displayName: 'Additional Fields',
							name: 'additionalFields',
							type: 'collection',
							options: [
								{
									name: 'Name',
									value: 'name',
									description: 'The name field',
								},
								{
									name: 'Age',
									value: 'age',
								},
							],
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Test Node
// Node: n8n-nodes-base.testNode

export interface TestNodeParameters {

  additionalFields?: {
  /** The name field */
  name?: any;
  age?: any;
};
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.testNode": TestNodeParameters;
}
`);
		});

		it('should handle multipleValues in typeOptions', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Test Node',
					name: 'n8n-nodes-base.testNode',
					properties: [
						{
							displayName: 'Multiple Strings',
							name: 'multipleStrings',
							type: 'string',
							typeOptions: {
								multipleValues: true,
							},
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			expect(result).toEqual(`// Auto-generated n8n Node Parameter Types

// Test Node
// Node: n8n-nodes-base.testNode

export interface TestNodeParameters {

  multipleStrings?: Array<string>;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.testNode": TestNodeParameters;
}
`);
		});

		it('should generate complete Action Network node with nested structures', () => {
			const nodes: NodeTypeDefinition[] = [
				{
					displayName: 'Action Network',
					name: 'n8n-nodes-base.actionNetwork',
					properties: [
						{
							displayName: 'Resource',
							name: 'resource',
							type: 'options',
							options: [
								{ name: 'Attendance', value: 'attendance' },
								{ name: 'Event', value: 'event' },
								{ name: 'Person', value: 'person' },
							],
							default: 'attendance',
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							displayOptions: {
								show: { resource: ['person'] },
							},
							options: [
								{ name: 'Create', value: 'create' },
								{ name: 'Get', value: 'get' },
								{ name: 'Update', value: 'update' },
							],
							default: 'create',
						},
						{
							displayName: 'Email Address',
							name: 'email_addresses',
							type: 'fixedCollection',
							default: {},
							description: "Person's email addresses",
							displayOptions: {
								show: {
									resource: ['person'],
									operation: ['create'],
								},
							},
							options: [
								{
									name: 'Email Addresses Fields',
									value: 'email_addresses_fields',
									values: [
										{
											displayName: 'Address',
											name: 'address',
											type: 'string',
											default: '',
											description: "Person's email address",
										},
										{
											displayName: 'Primary',
											name: 'primary',
											type: 'boolean',
											default: true,
											description: "Whether this is the person's primary email address",
										},
										{
											displayName: 'Status',
											name: 'status',
											type: 'options',
											default: 'subscribed',
											description: 'Subscription status of this email address',
											options: [
												{ name: 'Bouncing', value: 'bouncing' },
												{ name: 'Subscribed', value: 'subscribed' },
												{ name: 'Unsubscribed', value: 'unsubscribed' },
											],
										},
									],
								},
							],
						},
						{
							displayName: 'Additional Fields',
							name: 'additionalFields',
							type: 'collection',
							default: {},
							displayOptions: {
								show: {
									resource: ['person'],
									operation: ['create'],
								},
							},
							options: [
								{
									name: 'Family Name',
									value: 'family_name',
									description: "Person's last name",
								},
								{
									name: 'Given Name',
									value: 'given_name',
									description: "Person's first name",
								},
								{
									name: 'Postal Addresses',
									value: 'postal_addresses',
									values: [
										{
											displayName: 'Address Line',
											name: 'address_lines',
											type: 'string',
											default: '',
											description: "Line for a person's address",
										},
										{
											displayName: 'Postal Code',
											name: 'postal_code',
											type: 'string',
											default: '',
											description: 'Region specific postal code, such as ZIP code',
										},
										{
											displayName: 'Location',
											name: 'location',
											type: 'fixedCollection',
											default: {},
											options: [
												{
													name: 'Location Fields',
													value: 'location_fields',
													values: [
														{
															displayName: 'Latitude',
															name: 'latitude',
															type: 'string',
															default: '',
															description: 'Latitude of the location of the address',
														},
														{
															displayName: 'Longitude',
															name: 'longitude',
															type: 'string',
															default: '',
															description: 'Longitude of the location of the address',
														},
													],
												},
											],
										},
									],
								},
							],
						},
						{
							displayName: 'Simplify',
							name: 'simple',
							type: 'boolean',
							displayOptions: {
								show: {
									resource: ['person'],
									operation: ['create'],
								},
							},
							default: true,
							description:
								'Whether to return a simplified version of the response instead of the raw data',
						},
					],
				},
			];

			const result = convertNodeToTypes(nodes);

			// Note: The condition order may vary (resource/operation or operation/resource)
			const expectedOption1 = `// Auto-generated n8n Node Parameter Types

// Action Network
// Node: n8n-nodes-base.actionNetwork

export interface ActionNetworkParameters {

  resource?: "attendance" | "event" | "person";

  // Properties shown when: resource: person

  operation?: "create" | "get" | "update";

  // Properties shown when: resource: person AND operation: create

  /** Person's email addresses */
  email_addresses?: {
  "email_addresses_fields"?: {
    /** Person's email address */
    address?: string;
    /** Whether this is the person's primary email address */
    primary?: boolean;
    /** Subscription status of this email address */
    status?: "bouncing" | "subscribed" | "unsubscribed";
  };
};

  additionalFields?: {
  /** Person's last name */
  family_name?: any;
  /** Person's first name */
  given_name?: any;
  postal_addresses?: {
    /** Line for a person's address */
    address_lines?: string;
    /** Region specific postal code, such as ZIP code */
    postal_code?: string;
    location?: {
  "location_fields"?: {
    /** Latitude of the location of the address */
    latitude?: string;
    /** Longitude of the location of the address */
    longitude?: string;
  };
};
  };
};

  /** Whether to return a simplified version of the response instead of the raw data */
  simple?: boolean;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.actionNetwork": ActionNetworkParameters;
}
`;

			const expectedOption2 = `// Auto-generated n8n Node Parameter Types

// Action Network
// Node: n8n-nodes-base.actionNetwork

export interface ActionNetworkParameters {

  resource?: "attendance" | "event" | "person";

  // Properties shown when: resource: person

  operation?: "create" | "get" | "update";

  // Properties shown when: operation: create AND resource: person

  /** Person's email addresses */
  email_addresses?: {
  "email_addresses_fields"?: {
    /** Person's email address */
    address?: string;
    /** Whether this is the person's primary email address */
    primary?: boolean;
    /** Subscription status of this email address */
    status?: "bouncing" | "subscribed" | "unsubscribed";
  };
};

  additionalFields?: {
  /** Person's last name */
  family_name?: any;
  /** Person's first name */
  given_name?: any;
  postal_addresses?: {
    /** Line for a person's address */
    address_lines?: string;
    /** Region specific postal code, such as ZIP code */
    postal_code?: string;
    location?: {
  "location_fields"?: {
    /** Latitude of the location of the address */
    latitude?: string;
    /** Longitude of the location of the address */
    longitude?: string;
  };
};
  };
};

  /** Whether to return a simplified version of the response instead of the raw data */
  simple?: boolean;
}

// ---

// Node Type to Parameters Mapping
export interface NodeTypeToParametersMap {
  "n8n-nodes-base.actionNetwork": ActionNetworkParameters;
}
`;

			expect([expectedOption1, expectedOption2]).toContainEqual(result);
		});
	});
});
