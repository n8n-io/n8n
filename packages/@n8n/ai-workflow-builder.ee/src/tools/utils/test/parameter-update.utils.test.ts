/* eslint-disable id-denylist */
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import {
	extractNodeParameters,
	mergeParameters,
	validateParameters,
	formatNodeDefinition,
	updateNodeWithParameters,
	formatChangesForPrompt,
	fixExpressionPrefixes,
} from '../parameter-update.utils';

describe('parameter-update.utils', () => {
	// Mock node for testing
	const mockNode: INode = {
		id: 'node1',
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {
			url: 'https://example.com',
			method: 'GET',
			authentication: 'none',
		},
	};

	// Mock node type description
	const mockNodeType: INodeTypeDescription = {
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		group: ['input'],
		version: 1,
		description: 'Makes HTTP requests',
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to make the request to',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
					{ name: 'DELETE', value: 'DELETE' },
				],
				default: 'GET',
				required: false,
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{ name: 'Basic Auth', value: 'basicAuth' },
					{ name: 'Header Auth', value: 'headerAuth' },
				],
				default: 'none',
			},
			{
				displayName: 'Headers',
				name: 'headers',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'parameter',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
		defaults: { name: 'HTTP Request' },
	};

	describe('extractNodeParameters', () => {
		it('should extract parameters from node', () => {
			const params = extractNodeParameters(mockNode);
			expect(params).toEqual({
				url: 'https://example.com',
				method: 'GET',
				authentication: 'none',
			});
		});

		it('should return empty object for node without parameters', () => {
			const nodeWithoutParams: INode = {
				...mockNode,
				// @ts-expect-error Testing ivalid parameters
				parameters: undefined,
			};
			const params = extractNodeParameters(nodeWithoutParams);
			expect(params).toEqual({});
		});
	});

	describe('mergeParameters', () => {
		it('should merge parameters with new values taking precedence', () => {
			const existing = { url: 'https://old.com', method: 'GET' };
			const newParams = { url: 'https://new.com', headers: { 'X-Test': 'value' } };
			const result = mergeParameters(existing, newParams);

			expect(result).toEqual({
				url: 'https://new.com',
				method: 'GET',
				headers: { 'X-Test': 'value' },
			});
		});

		it('should handle null/undefined parameters', () => {
			// @ts-expect-error Testing ivalid parameters
			expect(mergeParameters(null, { url: 'test' })).toEqual({ url: 'test' });
			// @ts-expect-error Testing ivalid parameters
			expect(mergeParameters({ url: 'test' }, null)).toEqual({ url: 'test' });
			// @ts-expect-error Testing ivalid parameters
			expect(mergeParameters(null, null)).toEqual({});
			// @ts-expect-error Testing ivalid parameters
			expect(mergeParameters(undefined, { url: 'test' })).toEqual({ url: 'test' });
		});

		it('should deep merge nested objects', () => {
			const existing = {
				headers: {
					'Content-Type': 'application/json',
					'X-Old': 'old-value',
				},
				options: {
					timeout: 5000,
					retry: 3,
				},
			};
			const newParams = {
				headers: {
					'Content-Type': 'application/xml',
					'X-New': 'new-value',
				},
				options: {
					timeout: 10000,
				},
			};

			const result = mergeParameters(existing, newParams);
			expect(result).toEqual({
				headers: {
					'Content-Type': 'application/xml',
					'X-Old': 'old-value',
					'X-New': 'new-value',
				},
				options: {
					timeout: 10000,
					retry: 3,
				},
			});
		});

		it('should handle arrays without deep merging', () => {
			const existing = { items: ['a', 'b'] };
			const newParams = { items: ['c', 'd'] };
			const result = mergeParameters(existing, newParams);

			expect(result).toEqual({ items: ['c', 'd'] });
		});

		it('should handle mixed types correctly', () => {
			const existing = {
				string: 'old',
				number: 1,
				boolean: true,
				object: { key: 'old' },
				array: [1, 2],
				null: null,
			};
			const newParams = {
				string: 'new',
				number: 2,
				boolean: false,
				object: { key: 'new', extra: 'value' },
				array: [3, 4, 5],
				null: 'not-null',
			};

			const result = mergeParameters(existing, newParams);
			expect(result).toEqual({
				string: 'new',
				number: 2,
				boolean: false,
				object: { key: 'new', extra: 'value' },
				array: [3, 4, 5],
				null: 'not-null',
			});
		});

		it('should preserve existing keys not in new parameters', () => {
			const existing = { a: 1, b: 2, c: 3 };
			const newParams = { b: 20, d: 4 };
			const result = mergeParameters(existing, newParams);

			expect(result).toEqual({ a: 1, b: 20, c: 3, d: 4 });
		});

		it('should handle empty objects', () => {
			expect(mergeParameters({}, {})).toEqual({});
			expect(mergeParameters({ a: 1 }, {})).toEqual({ a: 1 });
			expect(mergeParameters({}, { a: 1 })).toEqual({ a: 1 });
		});

		it('should handle deeply nested structures', () => {
			const existing = {
				level1: {
					level2: {
						level3: {
							value: 'old',
							keep: 'this',
						},
					},
				},
			};
			const newParams = {
				level1: {
					level2: {
						level3: {
							value: 'new',
						},
						newLevel: 'added',
					},
				},
			};

			const result = mergeParameters(existing, newParams);
			expect(result).toEqual({
				level1: {
					level2: {
						level3: {
							value: 'new',
							keep: 'this',
						},
						newLevel: 'added',
					},
				},
			});
		});
	});

	describe('validateParameters', () => {
		it('should validate required parameters are present', () => {
			const params = { url: 'https://example.com' };
			const result = validateParameters(params, mockNodeType);

			expect(result).toEqual({
				valid: true,
				missingRequired: [],
			});
		});

		it('should detect missing required parameters', () => {
			const params = { method: 'POST' };
			const result = validateParameters(params, mockNodeType);

			expect(result).toEqual({
				valid: false,
				missingRequired: ['url'],
			});
		});

		it('should handle parameters with default values', () => {
			const nodeTypeWithDefaults: INodeTypeDescription = {
				...mockNodeType,
				properties: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: 'https://default.com',
						required: true,
					},
				],
			};

			const params = {};
			const result = validateParameters(params, nodeTypeWithDefaults);

			expect(result).toEqual({
				valid: true,
				missingRequired: [],
			});
		});

		it('should handle node types without properties', () => {
			const nodeTypeNoProps: INodeTypeDescription = {
				...mockNodeType,
				// @ts-expect-error Testing ivalid parameters
				properties: undefined,
			};

			const result = validateParameters({}, nodeTypeNoProps);
			expect(result).toEqual({
				valid: true,
				missingRequired: [],
			});
		});

		it('should handle multiple missing required parameters', () => {
			const nodeTypeMultiRequired: INodeTypeDescription = {
				...mockNodeType,
				properties: [
					{
						displayName: 'Field 1',
						default: '',
						name: 'field1',
						type: 'string',
						required: true,
					},
					{
						displayName: 'Field 2',
						default: '',
						name: 'field2',
						type: 'string',
						required: true,
					},
					{
						displayName: 'Field 3',
						default: '',
						name: 'field3',
						type: 'string',
						required: false,
					},
				],
			};

			const result = validateParameters({ field3: 'value' }, nodeTypeMultiRequired);
			expect(result).toEqual({
				valid: false,
				missingRequired: ['field1', 'field2'],
			});
		});
	});

	describe('formatNodeDefinition', () => {
		it('should format node definition for LLM', () => {
			const formatted = formatNodeDefinition(mockNodeType);

			expect(formatted).toContain('Node Type: n8n-nodes-base.httpRequest');
			expect(formatted).toContain('Display Name: HTTP Request');
			expect(formatted).toContain('Description: Makes HTTP requests');
			expect(formatted).toContain('Parameters:');
			expect(formatted).toContain('- url:');
			expect(formatted).toContain('  Type: string');
			expect(formatted).toContain('  Required: true');
			expect(formatted).toContain('- method:');
			expect(formatted).toContain('  Options: GET, POST, PUT, DELETE');
		});

		it('should handle node type without properties', () => {
			const nodeTypeNoProps: INodeTypeDescription = {
				...mockNodeType,
				// @ts-expect-error Testing ivalid parameters
				properties: undefined,
			};

			const formatted = formatNodeDefinition(nodeTypeNoProps);
			expect(formatted).toContain('No parameters defined');
		});

		it('should handle empty properties array', () => {
			const nodeTypeEmptyProps: INodeTypeDescription = {
				...mockNodeType,
				properties: [],
			};

			const formatted = formatNodeDefinition(nodeTypeEmptyProps);
			expect(formatted).toContain('No parameters defined');
		});

		it('should include default values when present', () => {
			const formatted = formatNodeDefinition(mockNodeType);
			expect(formatted).toContain('Default: "GET"');
			expect(formatted).toContain('Default: "none"');
		});

		it('should handle properties without description', () => {
			const nodeTypeNoDesc: INodeTypeDescription = {
				...mockNodeType,
				properties: [
					{
						displayName: 'Test',
						default: '',
						name: 'test',
						type: 'string',
					},
				],
			};

			const formatted = formatNodeDefinition(nodeTypeNoDesc);
			expect(formatted).toContain('- test:');
			expect(formatted).not.toContain('Description: undefined');
		});
	});

	describe('updateNodeWithParameters', () => {
		it('should create new node with updated parameters', () => {
			const newParams = { url: 'https://new.com', method: 'POST' };
			const updated = updateNodeWithParameters(mockNode, newParams);

			expect(updated).not.toBe(mockNode); // New object
			expect(updated.parameters).toEqual(newParams);
			expect(updated.id).toBe(mockNode.id);
			expect(updated.name).toBe(mockNode.name);
			expect(updated.type).toBe(mockNode.type);
		});

		it('should preserve all other node properties', () => {
			const nodeWithExtra = {
				...mockNode,
				credentials: { httpAuth: { id: '123', name: 'Auth' } },
				disabled: true,
			};

			const updated = updateNodeWithParameters(nodeWithExtra, { new: 'params' });
			expect(updated.credentials).toEqual(nodeWithExtra.credentials);
			expect(updated.disabled).toBe(true);
		});
	});

	describe('formatChangesForPrompt', () => {
		it('should format changes array into numbered list', () => {
			const changes = ['Update URL', 'Change method to POST', 'Add authentication'];
			const formatted = formatChangesForPrompt(changes);

			expect(formatted).toBe('1. Update URL\n2. Change method to POST\n3. Add authentication');
		});

		it('should handle empty array', () => {
			const formatted = formatChangesForPrompt([]);
			expect(formatted).toBe('');
		});

		it('should handle single change', () => {
			const formatted = formatChangesForPrompt(['Only change']);
			expect(formatted).toBe('1. Only change');
		});
	});

	describe('fixExpressionPrefixes', () => {
		it('should add = prefix to strings containing {{', () => {
			expect(fixExpressionPrefixes('{{ $json.data }}')).toBe('={{ $json.data }}');
			expect(fixExpressionPrefixes('Some text {{ $json.field }}')).toBe(
				'=Some text {{ $json.field }}',
			);
		});

		it('should not add prefix to strings already starting with =', () => {
			expect(fixExpressionPrefixes('={{ $json.data }}')).toBe('={{ $json.data }}');
		});

		it('should not modify strings without {{', () => {
			expect(fixExpressionPrefixes('normal string')).toBe('normal string');
			expect(fixExpressionPrefixes('{ json: true }')).toBe('{ json: true }');
		});

		it('should replace {{ $json }} with {{ $json.toJsonString() }}', () => {
			expect(fixExpressionPrefixes('{{ $json }}')).toBe('={{ $json.toJsonString() }}');
			expect(fixExpressionPrefixes('Value: {{ $json }}')).toBe(
				'=Value: {{ $json.toJsonString() }}',
			);
		});

		it('should handle arrays recursively', () => {
			const input = ['normal', '{{ $json.field }}', '={{ existing }}', ['nested {{ $json }}']];
			const expected = [
				'normal',
				'={{ $json.field }}',
				'={{ existing }}',
				['=nested {{ $json.toJsonString() }}'],
			];

			expect(fixExpressionPrefixes(input)).toEqual(expected);
		});

		it('should handle objects recursively', () => {
			const input = {
				normal: 'value',
				expression: '{{ $json.data }}',
				nested: {
					field: '{{ $json.nested }}',
					array: ['{{ $json.item }}'],
				},
				existing: '={{ $json.existing }}',
			};

			const expected = {
				normal: 'value',
				expression: '={{ $json.data }}',
				nested: {
					field: '={{ $json.nested }}',
					array: ['={{ $json.item }}'],
				},
				existing: '={{ $json.existing }}',
			};

			expect(fixExpressionPrefixes(input)).toEqual(expected);
		});

		it('should handle primitive types without modification', () => {
			expect(fixExpressionPrefixes(123)).toBe(123);
			expect(fixExpressionPrefixes(true)).toBe(true);
			expect(fixExpressionPrefixes(false)).toBe(false);
			expect(fixExpressionPrefixes(null)).toBe(null);
			expect(fixExpressionPrefixes(undefined)).toBe(undefined);
		});

		it('should handle complex nested structures', () => {
			const input = {
				headers: {
					Authorization: 'Bearer {{$credentials.apiKey}}',
					'Content-Type': 'application/json',
				},
				body: {
					data: '{{ $json.payload }}',
					nested: {
						value: '{{ $json }}',
						array: [{ expr: '{{ $json.item }}' }, 'normal'],
					},
				},
			};

			const expected = {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
					'Content-Type': 'application/json',
				},
				body: {
					data: '={{ $json.payload }}',
					nested: {
						value: '={{ $json.toJsonString() }}',
						array: [{ expr: '={{ $json.item }}' }, 'normal'],
					},
				},
			};

			expect(fixExpressionPrefixes(input)).toEqual(expected);
		});

		it('should handle edge cases', () => {
			// Empty string
			expect(fixExpressionPrefixes('')).toBe('');

			// String with multiple {{
			expect(fixExpressionPrefixes('{{ $json.a }} and {{ $json.b }}')).toBe(
				'={{ $json.a }} and {{ $json.b }}',
			);

			// Malformed expressions
			expect(fixExpressionPrefixes('{{ incomplete')).toBe('={{ incomplete');
			expect(fixExpressionPrefixes('}} reversed {{')).toBe('=}} reversed {{');
		});
	});
});
