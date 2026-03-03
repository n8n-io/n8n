import { describe, it, expect } from '@jest/globals';

import { buildExpressionAnnotations } from './expression-annotator';
import type { ExpressionValue } from './types';

describe('expression-annotator', () => {
	describe('buildExpressionAnnotations', () => {
		it('builds map from expression values', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				'Process User': [
					{ expression: '={{ $json.name }}', resolvedValue: 'John Doe' },
					{ expression: '={{ $json.id }}', resolvedValue: 123 },
				],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.name }}')).toBe('"John Doe"');
			expect(result.get('={{ $json.id }}')).toBe('123');
		});

		it('truncates long string values', () => {
			const longValue = 'a'.repeat(300);
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.data }}', resolvedValue: longValue }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.data }}')).toBe('"' + 'a'.repeat(250) + '..."');
		});

		it('handles boolean values', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.active }}', resolvedValue: true }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.active }}')).toBe('true');
		});

		it('handles null and undefined values', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [
					{ expression: '={{ $json.a }}', resolvedValue: null },
					{ expression: '={{ $json.b }}', resolvedValue: undefined },
				],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.a }}')).toBe('null');
			expect(result.get('={{ $json.b }}')).toBe('undefined');
		});

		it('parses "[null]" string as null', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.a }}', resolvedValue: '[null]' }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.a }}')).toBe('null');
		});

		it('parses "<EMPTY>" string as undefined', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.a }}', resolvedValue: '<EMPTY>' }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.a }}')).toBe('undefined');
		});

		it('shows type hint for arrays', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.items }}', resolvedValue: [1, 2, 3] }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.items }}')).toBe('[Array with 3 items]');
		});

		it('shows type hint for objects', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.data }}', resolvedValue: { key: 'value' } }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.data }}')).toBe('[Object]');
		});

		it('returns empty map for undefined input', () => {
			const result = buildExpressionAnnotations(undefined);

			expect(result.size).toBe(0);
		});

		it('handles multiple nodes with expressions', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node1: [{ expression: '={{ $json.a }}', resolvedValue: 'A' }],
				Node2: [{ expression: '={{ $json.b }}', resolvedValue: 'B' }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.a }}')).toBe('"A"');
			expect(result.get('={{ $json.b }}')).toBe('"B"');
		});

		it('creates secondary key from node name and parameter path', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				'HTTP Request': [
					{
						expression: '={{ $json.url }}',
						resolvedValue: 'https://example.com',
						parameterPath: 'url',
					},
				],
			};

			const result = buildExpressionAnnotations(expressionValues);

			// Should be accessible by both expression and node::path
			expect(result.get('={{ $json.url }}')).toBe('"https://example.com"');
			expect(result.get('HTTP Request::url')).toBe('"https://example.com"');
		});

		it('handles truncated expressions via parameter path lookup', () => {
			const longExpression = '={{ $json.' + 'a'.repeat(500) + ' }}';
			const truncatedExpression = longExpression.slice(0, 500) + '... [truncated]';

			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [
					{
						expression: truncatedExpression,
						resolvedValue: 'value',
						parameterPath: 'parameters.body',
					},
				],
			};

			const result = buildExpressionAnnotations(expressionValues);

			// Truncated expression key exists
			expect(result.get(truncatedExpression)).toBe('"value"');
			// But we can also look up by node::path
			expect(result.get('Node::parameters.body')).toBe('"value"');
		});

		it('handles nested parameter paths', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				'Set Node': [
					{
						expression: '={{ $json.data }}',
						resolvedValue: 'test',
						parameterPath: 'assignments.assignments[0].value',
					},
				],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('Set Node::assignments.assignments[0].value')).toBe('"test"');
		});

		it('does not create path key when parameterPath is missing', () => {
			const expressionValues: Record<string, ExpressionValue[]> = {
				Node: [{ expression: '={{ $json.x }}', resolvedValue: 'value' }],
			};

			const result = buildExpressionAnnotations(expressionValues);

			expect(result.get('={{ $json.x }}')).toBe('"value"');
			expect(result.has('Node::undefined')).toBe(false);
			expect(result.has('Node::')).toBe(false);
		});
	});
});
