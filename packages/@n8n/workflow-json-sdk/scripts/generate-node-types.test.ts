import { describe, expect, test } from 'vitest';

import {
	toPascalCase,
	getVersionString,
	mapPropertyTypeToTS,
	generateParameterInterface,
	deduplicateNodes,
	generateNodeTypes,
	type Node,
	type NodeProperty,
} from './generate-node-types';

describe('generate-node-types', () => {
	describe('toPascalCase', () => {
		test.each([
			{
				name: 'should convert simple node name',
				input: 'n8n-nodes-base.actionNetwork',
				expected: 'ActionNetwork',
			},
			{
				name: 'should convert node name with multiple dots',
				input: 'n8n-nodes-base.google.sheets',
				expected: 'Sheets',
			},
			{
				name: 'should handle already capitalized names',
				input: 'n8n-nodes-base.GoogleSheets',
				expected: 'GoogleSheets',
			},
			{
				name: 'should handle single word',
				input: 'slack',
				expected: 'Slack',
			},
			{
				name: 'should handle lowercase name',
				input: 'n8n-nodes-base.airtable',
				expected: 'Airtable',
			},
			{
				name: 'should handle name starting with capital letter',
				input: 'n8n-nodes-base.Notion',
				expected: 'Notion',
			},
		])('$name', ({ input, expected }) => {
			expect(toPascalCase(input)).toBe(expected);
		});
	});

	describe('getVersionString', () => {
		test.each([
			{
				name: 'should convert single number version',
				input: 1,
				expected: 'v1',
			},
			{
				name: 'should convert single number version 2',
				input: 2,
				expected: 'v2',
			},
			{
				name: 'should convert decimal version to underscored string',
				input: 1.1,
				expected: 'v1_1',
			},
			{
				name: 'should handle array of versions and return max',
				input: [1, 2, 3],
				expected: 'v3',
			},
			{
				name: 'should handle array with decimal versions',
				input: [1.0, 2.1, 1.5],
				expected: 'v2_1',
			},
			{
				name: 'should handle array with single version',
				input: [4],
				expected: 'v4',
			},
			{
				name: 'should handle version with multiple decimal places',
				input: 4.7,
				expected: 'v4_7',
			},
		])('$name', ({ input, expected }) => {
			expect(getVersionString(input)).toBe(expected);
		});
	});

	describe('mapPropertyTypeToTS', () => {
		test.each([
			{
				name: 'should map string type',
				input: { name: 'field', type: 'string' } as NodeProperty,
				expected: 'string',
			},
			{
				name: 'should map number type',
				input: { name: 'field', type: 'number' } as NodeProperty,
				expected: 'number',
			},
			{
				name: 'should map boolean type',
				input: { name: 'field', type: 'boolean' } as NodeProperty,
				expected: 'boolean',
			},
			{
				name: 'should map dateTime to string',
				input: { name: 'field', type: 'dateTime' } as NodeProperty,
				expected: 'string',
			},
			{
				name: 'should map collection to Record',
				input: { name: 'field', type: 'collection' } as NodeProperty,
				expected: 'Record<string, unknown>',
			},
			{
				name: 'should map fixedCollection to Record',
				input: { name: 'field', type: 'fixedCollection' } as NodeProperty,
				expected: 'Record<string, unknown>',
			},
			{
				name: 'should map json to string | object',
				input: { name: 'field', type: 'json' } as NodeProperty,
				expected: 'string | object',
			},
			{
				name: 'should map hidden to unknown',
				input: { name: 'field', type: 'hidden' } as NodeProperty,
				expected: 'unknown',
			},
			{
				name: 'should map notice to unknown',
				input: { name: 'field', type: 'notice' } as NodeProperty,
				expected: 'unknown',
			},
			{
				name: 'should map unknown type to unknown',
				input: { name: 'field', type: 'customType' } as NodeProperty,
				expected: 'unknown',
			},
		])('$name', ({ input, expected }) => {
			expect(mapPropertyTypeToTS(input)).toBe(expected);
		});

		describe('options type', () => {
			test('should map options with string values to union', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
					options: [
						{ name: 'Option 1', value: 'opt1' },
						{ name: 'Option 2', value: 'opt2' },
					],
				};
				expect(mapPropertyTypeToTS(input)).toBe("'opt1' | 'opt2'");
			});

			test('should map options with number values to union', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
					options: [
						{ name: 'One', value: 1 },
						{ name: 'Two', value: 2 },
					],
				};
				expect(mapPropertyTypeToTS(input)).toBe('1 | 2');
			});

			test('should map options with boolean values to union', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
					options: [
						{ name: 'True', value: true },
						{ name: 'False', value: false },
					],
				};
				expect(mapPropertyTypeToTS(input)).toBe('true | false');
			});

			test('should map options with mixed values to union', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
					options: [
						{ name: 'String', value: 'str' },
						{ name: 'Number', value: 42 },
						{ name: 'Boolean', value: true },
					],
				};
				expect(mapPropertyTypeToTS(input)).toBe("'str' | 42 | true");
			});

			test('should return string for options without options array', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
				};
				expect(mapPropertyTypeToTS(input)).toBe('string');
			});

			test('should return string for options with empty options array', () => {
				const input: NodeProperty = {
					name: 'field',
					type: 'options',
					options: [],
				};
				expect(mapPropertyTypeToTS(input)).toBe('string');
			});
		});
	});

	describe('generateParameterInterface', () => {
		test('should return null for node without properties', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
			};
			expect(generateParameterInterface(node)).toBeNull();
		});

		test('should return null for node with empty properties array', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				properties: [],
				uniqueKey: 'Test',
			};
			expect(generateParameterInterface(node)).toBeNull();
		});

		test('should generate interface with basic properties', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'field1', type: 'string' },
					{ name: 'field2', type: 'number' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('export interface TestParameters extends BaseNodeParams');
			expect(result).toContain('field1?: string;');
			expect(result).toContain('field2?: number;');
		});

		test('should include displayName as comment', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [{ name: 'field1', type: 'string', displayName: 'Field One' }],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('/** Field One */');
			expect(result).toContain('field1?: string;');
		});

		test('should skip base param properties with unknown type', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'returnAll', type: 'hidden' }, // unknown type, should be skipped
					{ name: 'customField', type: 'string' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).not.toContain('returnAll');
			expect(result).toContain('customField?: string;');
		});

		test('should include base param properties with specific union types', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{
						name: 'resource',
						type: 'options',
						options: [
							{ name: 'User', value: 'user' },
							{ name: 'Post', value: 'post' },
						],
					},
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain("resource?: 'user' | 'post';");
		});

		test('should quote restricted identifiers', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'number', type: 'string' },
					{ name: 'string', type: 'number' },
					{ name: 'boolean', type: 'boolean' },
					{ name: 'function', type: 'string' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain("'number'?: string;");
			expect(result).toContain("'string'?: number;");
			expect(result).toContain("'boolean'?: boolean;");
			expect(result).toContain("'function'?: string;");
		});

		test('should return type alias for node with only skipped properties', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'returnAll', type: 'hidden' },
					{ name: 'limit', type: 'hidden' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toBe('export type TestParameters = BaseNodeParams;');
		});

		test('should handle properties with options type', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{
						name: 'mode',
						type: 'options',
						displayName: 'Mode',
						options: [
							{ name: 'Simple', value: 'simple' },
							{ name: 'Advanced', value: 'advanced' },
						],
					},
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('/** Mode */');
			expect(result).toContain("mode?: 'simple' | 'advanced';");
		});

		test('should aggregate types for duplicate parameter names', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'format', type: 'string' },
					{ name: 'format', type: 'options', options: [{ name: 'JSON', value: 'json' }] },
					{ name: 'format', type: 'options', options: [{ name: 'XML', value: 'xml' }] },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain("format?: string | 'json' | 'xml';");
		});

		test('should aggregate types and deduplicate for duplicate parameter names', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'value', type: 'string' },
					{ name: 'value', type: 'number' },
					{ name: 'value', type: 'string' }, // Duplicate type, should not appear twice
					{ name: 'value', type: 'boolean' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('value?: string | number | boolean;');
			// Verify 'string' only appears once in the union
			const valueMatch = result?.match(/value\?:\s*([^;]+);/);
			expect(valueMatch).toBeTruthy();
			const typeUnion = valueMatch![1];
			const stringOccurrences = (typeUnion.match(/string/g) ?? []).length;
			expect(stringOccurrences).toBe(1);
		});

		test('should preserve displayName from first occurrence when aggregating', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'field', type: 'string', displayName: 'First Display Name' },
					{ name: 'field', type: 'number' },
					{ name: 'field', type: 'boolean', displayName: 'Another Display Name' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('/** First Display Name */');
			expect(result).not.toContain('/** Another Display Name */');
			expect(result).toContain('field?: string | number | boolean;');
		});

		test('should aggregate complex types including options unions', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{
						name: 'type',
						type: 'options',
						options: [
							{ name: 'A', value: 'a' },
							{ name: 'B', value: 'b' },
						],
					},
					{ name: 'type', type: 'string' },
					{
						name: 'type',
						type: 'options',
						options: [
							{ name: 'C', value: 'c' },
							{ name: 'D', value: 'd' },
						],
					},
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain("type?: 'a' | 'b' | string | 'c' | 'd';");
		});

		test('should handle aggregation with base param properties', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'resource', type: 'string' },
					{
						name: 'resource',
						type: 'options',
						options: [
							{ name: 'User', value: 'user' },
							{ name: 'Post', value: 'post' },
						],
					},
					{ name: 'customField', type: 'string' },
				],
			};
			const result = generateParameterInterface(node);
			// Should include aggregated resource since it has a specific union type
			expect(result).toContain("resource?: string | 'user' | 'post';");
			expect(result).toContain('customField?: string;');
		});

		test('should skip aggregated base params if all types are generic', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'options', type: 'collection' }, // Record<string, unknown>
					{ name: 'options', type: 'hidden' }, // unknown
					{ name: 'customField', type: 'string' },
				],
			};
			const result = generateParameterInterface(node);
			// Should skip options since all types are generic (Record<string, unknown> | unknown)
			expect(result).not.toContain('options?:');
			expect(result).toContain('customField?: string;');
		});

		test('should handle aggregation with single occurrence', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'singleField', type: 'string' },
					{ name: 'multiField', type: 'number' },
					{ name: 'multiField', type: 'boolean' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain('singleField?: string;');
			expect(result).toContain('multiField?: number | boolean;');
		});

		test('should aggregate types for restricted identifier property names', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{ name: 'number', type: 'string' },
					{ name: 'number', type: 'number' },
					{ name: 'function', type: 'boolean' },
					{ name: 'function', type: 'string' },
				],
			};
			const result = generateParameterInterface(node);
			expect(result).toContain("'number'?: string | number;");
			expect(result).toContain("'function'?: boolean | string;");
		});

		test('should deduplicate values in union types from multiple occurrences', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.test',
				displayName: 'Test',
				version: 1,
				uniqueKey: 'Test',
				properties: [
					{
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Get', value: 'get' },
							{ name: 'Create', value: 'create' },
						],
					},
					{
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Get', value: 'get' }, // Duplicate
							{ name: 'Update', value: 'update' },
						],
					},
					{
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Create', value: 'create' }, // Duplicate
							{ name: 'Delete', value: 'delete' },
						],
					},
				],
			};
			const result = generateParameterInterface(node);
			// Should deduplicate and only include each value once
			expect(result).toContain('operation?:');
			// Verify each value appears only once in the result
			const operationMatch = result?.match(/operation\?:\s*([^;]+);/);
			expect(operationMatch).toBeTruthy();
			const typeUnion = operationMatch![1];
			expect(typeUnion).toContain("'get'");
			expect(typeUnion).toContain("'create'");
			expect(typeUnion).toContain("'update'");
			expect(typeUnion).toContain("'delete'");
			// Count occurrences - each should appear exactly once
			expect((typeUnion.match(/'get'/g) ?? []).length).toBe(1);
			expect((typeUnion.match(/'create'/g) ?? []).length).toBe(1);
		});

		test('should filter out generic types from base param unions to avoid conflicts', () => {
			const node: Node & { uniqueKey: string } = {
				name: 'n8n-nodes-base.rabbitmq',
				displayName: 'RabbitMQ',
				version: 1,
				uniqueKey: 'Rabbitmq',
				properties: [
					{
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Send', value: 'send' },
							{ name: 'Receive', value: 'receive' },
						],
					},
					{
						name: 'operation',
						type: 'hidden', // Maps to 'unknown'
					},
					{
						name: 'resource',
						type: 'string',
					},
				],
			};
			const result = generateParameterInterface(node);
			// Should filter out 'unknown' and only include specific types
			expect(result).toContain("operation?: 'send' | 'receive';");
			expect(result).not.toContain('unknown');
			expect(result).toContain('resource?: string;');
		});
	});

	describe('deduplicateNodes', () => {
		test('should handle single node without version suffix', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(1);
			expect(result[0].uniqueKey).toBe('Slack');
		});

		test('should add version suffix for multiple versions of same node', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 2,
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(2);
			expect(result[0].uniqueKey).toBe('Slack_v1');
			expect(result[1].uniqueKey).toBe('Slack_v2');
		});

		test('should handle array version and pick max', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.airtable',
					displayName: 'Airtable',
					version: [1, 2],
				},
				{
					name: 'n8n-nodes-base.airtable',
					displayName: 'Airtable',
					version: 3,
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(2);
			expect(result[0].uniqueKey).toBe('Airtable_v2');
			expect(result[1].uniqueKey).toBe('Airtable_v3');
		});

		test('should handle decimal versions', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.googleSheets',
					displayName: 'Google Sheets',
					version: 4.7,
				},
				{
					name: 'n8n-nodes-base.googleSheets',
					displayName: 'Google Sheets',
					version: 4.8,
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(2);
			expect(result[0].uniqueKey).toBe('GoogleSheets_v4_7');
			expect(result[1].uniqueKey).toBe('GoogleSheets_v4_8');
		});

		test('should handle duplicate keys with additional suffix', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test',
					version: 1, // Same version
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(2);
			expect(result[0].uniqueKey).toBe('Test_v1');
			expect(result[1].uniqueKey).toBe('Test_v1_1');
		});

		test('should handle mixed scenario with single and multiple versions', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.notion',
					displayName: 'Notion',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 2,
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result).toHaveLength(3);
			expect(result[0].uniqueKey).toBe('Slack_v1');
			expect(result[1].uniqueKey).toBe('Notion');
			expect(result[2].uniqueKey).toBe('Slack_v2');
		});

		test('should preserve all node properties', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test Node',
					version: 1,
					properties: [{ name: 'field', type: 'string' }],
				},
			];
			const result = deduplicateNodes(nodes);
			expect(result[0].name).toBe('n8n-nodes-base.test');
			expect(result[0].displayName).toBe('Test Node');
			expect(result[0].version).toBe(1);
			expect(result[0].properties).toHaveLength(1);
		});
	});

	describe('generateNodeTypes', () => {
		test('should generate valid TypeScript code structure', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test',
					version: 1,
					properties: [{ name: 'field', type: 'string' }],
				},
			];
			const result = generateNodeTypes(nodes);

			// Check for main sections
			expect(result).toContain('// Auto-generated node types from nodes.json');
			expect(result).toContain('// ===== Base Parameter Types =====');
			expect(result).toContain('// ===== Node Type Constants =====');
			expect(result).toContain('// ===== Display Name Mapping =====');
			expect(result).toContain('// ===== Node Parameter Interfaces =====');
			expect(result).toContain('// ===== Node Parameters Map =====');
			expect(result).toContain('// ===== Helper Types =====');
			expect(result).toContain('// ===== Usage Examples =====');
		});

		test('should generate base parameter interfaces', () => {
			const nodes: Node[] = [];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export interface PaginationParams');
			expect(result).toContain('returnAll?: boolean;');
			expect(result).toContain('limit?: number;');
			expect(result).toContain('export interface ResourceBasedParams');
			expect(result).toContain('resource?: string;');
			expect(result).toContain('operation?: string;');
			expect(result).toContain('export interface ExtendableParams');
			expect(result).toContain('additionalFields?: Record<string, unknown>;');
			expect(result).toContain('export interface BaseNodeParams');
		});

		test('should generate NodeTypes constant', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.notion',
					displayName: 'Notion',
					version: 1,
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export const NodeTypes = {');
			expect(result).toContain("Slack: 'n8n-nodes-base.slack' as const");
			expect(result).toContain("Notion: 'n8n-nodes-base.notion' as const");
			expect(result).toContain('} as const;');
		});

		test('should generate NodeType union with unique values', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 2,
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export type NodeType =');
			expect(result).toContain("| 'n8n-nodes-base.slack'");
			// Should appear: twice in NodeTypes (v1 and v2), once in NodeType union, once in NodeDisplayNames
			const matches = result.match(/'n8n-nodes-base\.slack'/g);
			expect(matches?.length).toBe(4); // Twice in NodeTypes, once in NodeType union, once in NodeDisplayNames
		});

		test('should generate NodeDisplayNames mapping', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export const NodeDisplayNames: Record<NodeType, string> = {');
			expect(result).toContain("'n8n-nodes-base.slack': 'Slack'");
		});

		test('should generate parameter interfaces for nodes with properties', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test',
					version: 1,
					properties: [
						{ name: 'field1', type: 'string', displayName: 'Field 1' },
						{ name: 'field2', type: 'number', displayName: 'Field 2' },
					],
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export interface TestParameters extends BaseNodeParams');
			expect(result).toContain('/** Field 1 */');
			expect(result).toContain('field1?: string;');
			expect(result).toContain('/** Field 2 */');
			expect(result).toContain('field2?: number;');
		});

		test('should generate NodeParametersMap', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test',
					displayName: 'Test',
					version: 1,
					properties: [{ name: 'field', type: 'string' }],
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('export interface NodeParametersMap {');
			expect(result).toContain("'n8n-nodes-base.test': TestParameters;");
		});

		test('should generate helper types', () => {
			const nodes: Node[] = [];
			const result = generateNodeTypes(nodes);

			expect(result).toContain(
				'export type NodeTypeValue = (typeof NodeTypes)[keyof typeof NodeTypes]',
			);
			expect(result).toContain('export type GetNodeParameters<T extends NodeType>');
			expect(result).toContain('export type NodeParameters<T extends NodeType = NodeType>');
		});

		test('should include usage examples in comments', () => {
			const nodes: Node[] = [];
			const result = generateNodeTypes(nodes);

			expect(result).toContain('USAGE:');
			expect(result).toContain('1. Type-safe node type strings:');
			expect(result).toContain('2. Function accepting any node type:');
			expect(result).toContain('3. Get display name for a node:');
			expect(result).toContain('4. Type node parameters:');
			expect(result).toContain('5. Check if string is valid node type:');
		});

		test('should handle nodes with versioned keys in NodeTypes', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 2,
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain("Slack_v1: 'n8n-nodes-base.slack' as const");
			expect(result).toContain("Slack_v2: 'n8n-nodes-base.slack' as const");
		});

		test('should disable eslint naming convention rule', () => {
			const nodes: Node[] = [];
			const result = generateNodeTypes(nodes);

			expect(result).toMatch(/^\/\* eslint-disable @typescript-eslint\/naming-convention \*\//);
		});

		test('should handle nodes without properties in NodeParametersMap', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.test1',
					displayName: 'Test 1',
					version: 1,
					properties: [{ name: 'field', type: 'string' }],
				},
				{
					name: 'n8n-nodes-base.test2',
					displayName: 'Test 2',
					version: 1,
				},
			];
			const result = generateNodeTypes(nodes);

			expect(result).toContain("'n8n-nodes-base.test1': Test1Parameters;");
			expect(result).not.toContain("'n8n-nodes-base.test2': Test2Parameters;");
		});

		test('should use first version for NodeParametersMap when multiple versions exist', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
					properties: [{ name: 'field1', type: 'string' }],
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 2,
					properties: [{ name: 'field2', type: 'number' }],
				},
			];
			const result = generateNodeTypes(nodes);

			// Should only have one entry in NodeParametersMap
			const parametersMapMatch = result.match(/'n8n-nodes-base\.slack': Slack_v\d+Parameters;/g);
			expect(parametersMapMatch).toHaveLength(1);
			expect(result).toContain("'n8n-nodes-base.slack': Slack_v1Parameters;");
		});

		test('should generate complete and valid TypeScript for complex scenario', () => {
			const nodes: Node[] = [
				{
					name: 'n8n-nodes-base.googleSheets',
					displayName: 'Google Sheets',
					version: 4.7,
					properties: [
						{
							name: 'resource',
							type: 'options',
							displayName: 'Resource',
							options: [
								{ name: 'Sheet', value: 'sheet' },
								{ name: 'Spreadsheet', value: 'spreadsheet' },
							],
						},
						{
							name: 'operation',
							type: 'options',
							displayName: 'Operation',
							options: [
								{ name: 'Read', value: 'read' },
								{ name: 'Write', value: 'write' },
							],
						},
					],
				},
				{
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					version: 1,
					properties: [{ name: 'channel', type: 'string', displayName: 'Channel' }],
				},
			];
			const result = generateNodeTypes(nodes);

			// Verify structure
			expect(result).toContain('export const NodeTypes = {');
			expect(result).toContain('GoogleSheets: ');
			expect(result).toContain('Slack: ');
			expect(result).toContain('export type NodeType =');
			expect(result).toContain('export const NodeDisplayNames');
			expect(result).toContain('export interface GoogleSheetsParameters extends BaseNodeParams');
			expect(result).toContain("resource?: 'sheet' | 'spreadsheet';");
			expect(result).toContain("operation?: 'read' | 'write';");
			expect(result).toContain('export interface SlackParameters extends BaseNodeParams');
			expect(result).toContain('channel?: string;');
			expect(result).toContain('export interface NodeParametersMap {');
		});
	});
});
