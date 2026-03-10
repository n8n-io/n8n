import { describe, it, expect } from '@jest/globals';

import { n8nExprToDataFlow, dataFlowExprToN8n } from '../codegen/dataflow/dataflow-expression';

describe('dataflow-expression', () => {
	describe('n8nExprToDataFlow', () => {
		describe('simple $json property access', () => {
			it('converts simple $json.field to sourceVar[0].json.field', () => {
				expect(n8nExprToDataFlow('={{ $json.email }}', 'input')).toBe('input[0].json.email');
			});

			it('converts nested $json property access', () => {
				expect(n8nExprToDataFlow('={{ $json.user.name }}', 'input')).toBe(
					'input[0].json.user.name',
				);
			});

			it('converts bracket notation for fields with spaces', () => {
				expect(n8nExprToDataFlow('={{ $json["field name"] }}', 'input')).toBe(
					'input[0].json["field name"]',
				);
			});

			it('converts deeply nested property access', () => {
				expect(n8nExprToDataFlow('={{ $json.a.b.c.d }}', 'data')).toBe('data[0].json.a.b.c.d');
			});

			it('preserves mixed dot and bracket notation', () => {
				expect(n8nExprToDataFlow('={{ $json.user["first name"] }}', 'src')).toBe(
					'src[0].json.user["first name"]',
				);
			});
		});

		describe('$("NodeName") references', () => {
			it('converts node reference using varMap', () => {
				const varMap = new Map([['NodeName', 'nodeVar']]);
				expect(n8nExprToDataFlow('={{ $("NodeName").item.json.x }}', 'input', varMap)).toBe(
					'nodeVar[0].json.x',
				);
			});

			it('converts node reference with nested properties', () => {
				const varMap = new Map([['My Node', 'myNode']]);
				expect(n8nExprToDataFlow('={{ $("My Node").item.json.user.email }}', 'input', varMap)).toBe(
					'myNode[0].json.user.email',
				);
			});

			it('falls back to expr() when node name is not in varMap', () => {
				const varMap = new Map<string, string>();
				expect(n8nExprToDataFlow('={{ $("Unknown").item.json.x }}', 'input', varMap)).toBe(
					'expr(\'{{ $("Unknown").item.json.x }}\')',
				);
			});

			it('converts node reference without varMap using expr() fallback', () => {
				expect(n8nExprToDataFlow('={{ $("NodeName").item.json.x }}', 'input')).toBe(
					'expr(\'{{ $("NodeName").item.json.x }}\')',
				);
			});
		});

		describe('mixed text and expressions', () => {
			it('converts mixed text with single expression to template literal', () => {
				expect(n8nExprToDataFlow('Hello {{ $json.name }}', 'input')).toBe(
					'`Hello ${input[0].json.name}`',
				);
			});

			it('converts text with expression at the start', () => {
				expect(n8nExprToDataFlow('{{ $json.greeting }} World', 'input')).toBe(
					'`${input[0].json.greeting} World`',
				);
			});

			it('converts multiple expressions in one string', () => {
				expect(n8nExprToDataFlow('{{ $json.first }} and {{ $json.last }}', 'src')).toBe(
					'`${src[0].json.first} and ${src[0].json.last}`',
				);
			});
		});

		describe('non-expression strings', () => {
			it('returns plain string as quoted string', () => {
				expect(n8nExprToDataFlow('just a string', 'input')).toBe("'just a string'");
			});

			it('returns empty string as quoted empty string', () => {
				expect(n8nExprToDataFlow('', 'input')).toBe("''");
			});
		});

		describe('complex / fallback expressions', () => {
			it('wraps non-$json expressions in expr()', () => {
				expect(n8nExprToDataFlow('={{ $now.toISO() }}', 'input')).toBe(
					"expr('{{ $now.toISO() }}')",
				);
			});

			it('wraps $json method calls in expr()', () => {
				expect(n8nExprToDataFlow('={{ $json.items.map(i => i.id) }}', 'input')).toBe(
					"expr('{{ $json.items.map(i => i.id) }}')",
				);
			});

			it('wraps expressions with arithmetic in expr()', () => {
				expect(n8nExprToDataFlow('={{ $json.price * 1.1 }}', 'input')).toBe(
					"expr('{{ $json.price * 1.1 }}')",
				);
			});
		});

		describe('edge cases', () => {
			it('handles expression with whitespace around content', () => {
				expect(n8nExprToDataFlow('={{  $json.email  }}', 'input')).toBe('input[0].json.email');
			});

			it('handles single quotes in non-expression strings', () => {
				expect(n8nExprToDataFlow("it's a test", 'input')).toBe("'it\\'s a test'");
			});
		});
	});

	describe('dataFlowExprToN8n', () => {
		describe('simple property access', () => {
			it('converts sourceVar[0].json.field to $json expression', () => {
				expect(dataFlowExprToN8n('input[0].json.email')).toBe('={{ $json.email }}');
			});

			it('converts nested property access', () => {
				expect(dataFlowExprToN8n('input[0].json.user.name')).toBe('={{ $json.user.name }}');
			});

			it('converts bracket notation', () => {
				expect(dataFlowExprToN8n('input[0].json["field name"]')).toBe('={{ $json["field name"] }}');
			});

			it('converts deeply nested property access', () => {
				expect(dataFlowExprToN8n('data[0].json.a.b.c.d')).toBe('={{ $json.a.b.c.d }}');
			});
		});

		describe('node reference via varToNodeName', () => {
			it('converts variable to $("NodeName") reference', () => {
				const varToNodeName = new Map([['nodeVar', 'NodeName']]);
				expect(dataFlowExprToN8n('nodeVar[0].json.x', varToNodeName)).toBe(
					'={{ $("NodeName").item.json.x }}',
				);
			});

			it('converts variable with nested properties', () => {
				const varToNodeName = new Map([['myNode', 'My Node']]);
				expect(dataFlowExprToN8n('myNode[0].json.user.email', varToNodeName)).toBe(
					'={{ $("My Node").item.json.user.email }}',
				);
			});

			it('uses $json when variable is not in varToNodeName map', () => {
				const varToNodeName = new Map<string, string>();
				expect(dataFlowExprToN8n('input[0].json.email', varToNodeName)).toBe('={{ $json.email }}');
			});
		});

		describe('template literals', () => {
			it('converts template literal to mixed text + expression', () => {
				expect(dataFlowExprToN8n('`Hello ${input[0].json.name}`')).toBe('Hello {{ $json.name }}');
			});

			it('converts template literal with expression at start', () => {
				expect(dataFlowExprToN8n('`${input[0].json.greeting} World`')).toBe(
					'{{ $json.greeting }} World',
				);
			});

			it('converts template literal with multiple expressions', () => {
				expect(dataFlowExprToN8n('`${src[0].json.first} and ${src[0].json.last}`')).toBe(
					'{{ $json.first }} and {{ $json.last }}',
				);
			});

			it('converts template literal with node references', () => {
				const varToNodeName = new Map([['nodeVar', 'NodeName']]);
				expect(dataFlowExprToN8n('`Hello ${nodeVar[0].json.name}`', varToNodeName)).toBe(
					'Hello {{ $("NodeName").item.json.name }}',
				);
			});
		});

		describe('expr() wrapper', () => {
			it('unwraps expr() and returns inner expression', () => {
				expect(dataFlowExprToN8n("expr('{{ $now.toISO() }}')")).toBe('={{ $now.toISO() }}');
			});

			it('unwraps expr() with double quotes', () => {
				expect(dataFlowExprToN8n('expr("{{ $json.items.map(i => i.id) }}")')).toBe(
					'={{ $json.items.map(i => i.id) }}',
				);
			});
		});

		describe('edge cases', () => {
			it('handles plain quoted string as non-expression', () => {
				expect(dataFlowExprToN8n("'just a string'")).toBe('just a string');
			});

			it('handles empty quoted string', () => {
				expect(dataFlowExprToN8n("''")).toBe('');
			});
		});
	});
});
