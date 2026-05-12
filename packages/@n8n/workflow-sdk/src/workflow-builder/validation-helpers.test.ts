import { describe, it, expect } from '@jest/globals';

import {
	containsExpression,
	containsMalformedExpression,
	isSensitiveHeader,
	isCredentialFieldName,
	isToolNode,
	containsFromAI,
	isTriggerNode,
	findMissingExpressionPrefixes,
	findInvalidDateMethods,
	hasLuxonToISOStringMisuse,
	extractExpressions,
	parseExpression,
	hasPath,
	TOOLS_WITHOUT_PARAMETERS,
} from './validation-helpers';

describe('workflow-builder/validation-helpers', () => {
	describe('containsExpression', () => {
		it('returns true for strings with ={{', () => {
			expect(containsExpression('={{ $json.field }}')).toBe(true);
		});

		it('returns true for strings starting with =', () => {
			expect(containsExpression('={{ $json.field }}')).toBe(true);
			expect(containsExpression('=$json.field')).toBe(true);
		});

		it('returns false for strings without expression', () => {
			expect(containsExpression('plain text')).toBe(false);
			expect(containsExpression('{{ $json.field }}')).toBe(false);
		});

		it('returns false for non-strings', () => {
			expect(containsExpression(123)).toBe(false);
			expect(containsExpression(null)).toBe(false);
			expect(containsExpression(undefined)).toBe(false);
		});
	});

	describe('containsMalformedExpression', () => {
		it('returns true for {{ $ without = prefix', () => {
			expect(containsMalformedExpression('{{ $json.field }}')).toBe(true);
		});

		it('returns false for proper expressions', () => {
			expect(containsMalformedExpression('={{ $json.field }}')).toBe(false);
		});

		it('returns false for non-strings', () => {
			expect(containsMalformedExpression(123)).toBe(false);
		});
	});

	describe('isSensitiveHeader', () => {
		it('returns true for authorization headers', () => {
			expect(isSensitiveHeader('Authorization')).toBe(true);
			expect(isSensitiveHeader('AUTHORIZATION')).toBe(true);
		});

		it('returns true for api-key headers', () => {
			expect(isSensitiveHeader('x-api-key')).toBe(true);
			expect(isSensitiveHeader('api-key')).toBe(true);
			expect(isSensitiveHeader('apikey')).toBe(true);
		});

		it('returns true for auth token headers', () => {
			expect(isSensitiveHeader('x-auth-token')).toBe(true);
			expect(isSensitiveHeader('x-access-token')).toBe(true);
		});

		it('returns false for non-sensitive headers', () => {
			expect(isSensitiveHeader('Content-Type')).toBe(false);
			expect(isSensitiveHeader('Accept')).toBe(false);
		});
	});

	describe('isCredentialFieldName', () => {
		it('returns true for api key patterns', () => {
			expect(isCredentialFieldName('api_key')).toBe(true);
			expect(isCredentialFieldName('api-key')).toBe(true);
			expect(isCredentialFieldName('apiKey')).toBe(true);
		});

		it('returns true for token patterns', () => {
			expect(isCredentialFieldName('access_token')).toBe(true);
			expect(isCredentialFieldName('auth_token')).toBe(true);
			expect(isCredentialFieldName('bearer_token')).toBe(true);
			expect(isCredentialFieldName('token')).toBe(true);
		});

		it('returns true for secret/password patterns', () => {
			expect(isCredentialFieldName('secret_key')).toBe(true);
			expect(isCredentialFieldName('private_key')).toBe(true);
			expect(isCredentialFieldName('client_secret')).toBe(true);
			expect(isCredentialFieldName('password')).toBe(true);
		});

		it('returns false for non-credential fields', () => {
			expect(isCredentialFieldName('name')).toBe(false);
			expect(isCredentialFieldName('email')).toBe(false);
			expect(isCredentialFieldName('user_id')).toBe(false);
		});
	});

	describe('isToolNode', () => {
		it('returns true for types containing tool', () => {
			expect(isToolNode('@n8n/n8n-nodes-langchain.toolCalculator')).toBe(true);
			expect(isToolNode('@n8n/n8n-nodes-langchain.toolCode')).toBe(true);
		});

		it('returns true for types containing Tool', () => {
			expect(isToolNode('@n8n/n8n-nodes-langchain.mcpClientTool')).toBe(true);
		});

		it('returns false for non-tool types', () => {
			expect(isToolNode('n8n-nodes-base.httpRequest')).toBe(false);
			expect(isToolNode('@n8n/n8n-nodes-langchain.agent')).toBe(false);
		});
	});

	describe('TOOLS_WITHOUT_PARAMETERS', () => {
		it('contains known tools without parameters', () => {
			expect(TOOLS_WITHOUT_PARAMETERS.has('@n8n/n8n-nodes-langchain.toolCalculator')).toBe(true);
			expect(TOOLS_WITHOUT_PARAMETERS.has('@n8n/n8n-nodes-langchain.toolWikipedia')).toBe(true);
		});
	});

	describe('containsFromAI', () => {
		it('returns true for strings containing $fromAI', () => {
			expect(containsFromAI('$fromAI("field")')).toBe(true);
		});

		it('returns true for arrays containing $fromAI', () => {
			expect(containsFromAI(['hello', '$fromAI("field")'])).toBe(true);
		});

		it('returns true for objects containing $fromAI', () => {
			expect(containsFromAI({ key: '$fromAI("field")' })).toBe(true);
			expect(containsFromAI({ nested: { key: '$fromAI("field")' } })).toBe(true);
		});

		it('returns false for values without $fromAI', () => {
			expect(containsFromAI('hello')).toBe(false);
			expect(containsFromAI(123)).toBe(false);
			expect(containsFromAI(null)).toBe(false);
		});
	});

	describe('isTriggerNode', () => {
		it('returns true for trigger nodes', () => {
			expect(isTriggerNode('n8n-nodes-base.manualTrigger')).toBe(true);
			expect(isTriggerNode('n8n-nodes-base.webhook')).toBe(true);
		});

		it('returns false for non-trigger nodes', () => {
			expect(isTriggerNode('n8n-nodes-base.httpRequest')).toBe(false);
		});
	});

	describe('findMissingExpressionPrefixes', () => {
		it('finds strings with {{ $ without = prefix', () => {
			const issues = findMissingExpressionPrefixes({
				field: '{{ $json.field }}',
			});
			expect(issues).toHaveLength(1);
			expect(issues[0].path).toBe('field');
		});

		it('ignores proper expressions', () => {
			const issues = findMissingExpressionPrefixes({
				field: '={{ $json.field }}',
			});
			expect(issues).toHaveLength(0);
		});

		it('recurses into nested objects', () => {
			const issues = findMissingExpressionPrefixes({
				nested: {
					field: '{{ $json.field }}',
				},
			});
			expect(issues).toHaveLength(1);
			expect(issues[0].path).toBe('nested.field');
		});

		it('recurses into arrays', () => {
			const issues = findMissingExpressionPrefixes({
				items: ['ok', '{{ $json.field }}'],
			});
			expect(issues).toHaveLength(1);
			expect(issues[0].path).toBe('items[1]');
		});

		it('skips PlaceholderValue objects', () => {
			const issues = findMissingExpressionPrefixes({
				field: {
					__placeholder: true,
					hint: '{{ $json.field }}',
				},
			});
			expect(issues).toHaveLength(0);
		});
	});

	describe('findInvalidDateMethods', () => {
		it('finds .toISOString() misuse with Luxon', () => {
			const issues = findInvalidDateMethods({
				date: '={{ $now.toISOString() }}',
			});
			expect(issues).toHaveLength(1);
		});

		it('ignores valid JS Date usage', () => {
			const issues = findInvalidDateMethods({
				date: '={{ new Date().toISOString() }}',
			});
			expect(issues).toHaveLength(0);
		});
	});

	describe('hasLuxonToISOStringMisuse', () => {
		it('returns true for $now.toISOString()', () => {
			expect(hasLuxonToISOStringMisuse('$now.toISOString()')).toBe(true);
		});

		it('returns true for $today.toISOString()', () => {
			expect(hasLuxonToISOStringMisuse('$today.toISOString()')).toBe(true);
		});

		it('returns true for DateTime.now().toISOString()', () => {
			expect(hasLuxonToISOStringMisuse('DateTime.now().toISOString()')).toBe(true);
		});

		it('returns false for new Date().toISOString()', () => {
			expect(hasLuxonToISOStringMisuse('new Date().toISOString()')).toBe(false);
		});

		it('returns false for strings without .toISOString()', () => {
			expect(hasLuxonToISOStringMisuse('$now.toISO()')).toBe(false);
		});
	});

	describe('extractExpressions', () => {
		it('extracts expressions starting with =', () => {
			const expressions = extractExpressions({
				field: '={{ $json.field }}',
				plain: 'text',
			});
			expect(expressions).toHaveLength(1);
			expect(expressions[0].expression).toBe('={{ $json.field }}');
			expect(expressions[0].path).toBe('field');
		});

		it('handles nested objects', () => {
			const expressions = extractExpressions({
				nested: { field: '={{ $json.a }}' },
			});
			expect(expressions).toHaveLength(1);
			expect(expressions[0].path).toBe('nested.field');
		});

		it('handles arrays', () => {
			const expressions = extractExpressions({
				items: ['plain', '={{ $json.b }}'],
			});
			expect(expressions).toHaveLength(1);
			expect(expressions[0].path).toBe('items[1]');
		});
	});

	describe('parseExpression', () => {
		it('parses $json expressions', () => {
			const result = parseExpression('={{ $json.field.nested }}');
			expect(result.type).toBe('$json');
			expect(result.fieldPath).toEqual(['field', 'nested']);
		});

		it('parses $node expressions', () => {
			const result = parseExpression("={{ $('Node1').item.json.field }}");
			expect(result.type).toBe('$node');
			expect(result.nodeName).toBe('Node1');
			expect(result.fieldPath).toEqual(['field']);
		});

		it('returns other for unknown patterns', () => {
			const result = parseExpression('={{ $now }}');
			expect(result.type).toBe('other');
			expect(result.fieldPath).toEqual([]);
		});
	});

	describe('hasPath', () => {
		it('returns true for existing paths', () => {
			expect(hasPath({ a: { b: 1 } }, ['a', 'b'])).toBe(true);
		});

		it('returns false for non-existing paths', () => {
			expect(hasPath({ a: 1 }, ['b'])).toBe(false);
		});

		it('returns false for paths through primitives', () => {
			expect(hasPath({ a: 1 }, ['a', 'b'])).toBe(false);
		});

		it('handles empty paths', () => {
			expect(hasPath({ a: 1 }, [])).toBe(true);
		});
	});
});
