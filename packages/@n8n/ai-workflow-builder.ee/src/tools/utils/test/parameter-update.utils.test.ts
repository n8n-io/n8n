/* eslint-disable id-denylist */
import type { INode } from 'n8n-workflow';

import {
	extractNodeParameters,
	mergeParameters,
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
