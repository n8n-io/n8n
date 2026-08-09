import {
	collectStrings,
	currentJsonExpression,
	extractJsonColumnRefs,
	extractNamedRefMatches,
	nodeItemJsonExpression,
} from '../column-ref-utils';

describe('column-ref-utils', () => {
	describe('collectStrings', () => {
		it('walks nested objects and arrays', () => {
			const v = { a: 'x', b: ['y', { c: 'z' }] };
			expect(collectStrings(v).sort()).toEqual(['x', 'y', 'z']);
		});
	});

	describe('extractJsonColumnRefs', () => {
		it('extracts $json.field references', () => {
			expect(extractJsonColumnRefs('hello {{ $json.user_query }}')).toEqual(['user_query']);
		});
		it('extracts $json["field"] references', () => {
			expect(extractJsonColumnRefs('hello {{ $json["user-query"] }}')).toEqual(['user-query']);
		});
		it('does not treat bare item.json.field references as direct input columns', () => {
			expect(extractJsonColumnRefs('{{ item.json.expected_response }}')).toEqual([]);
		});
		it('extracts $input.item.json.field references', () => {
			expect(extractJsonColumnRefs('$input.item.json.input_text')).toEqual(['input_text']);
		});
		it('extracts $input.first().json.field references', () => {
			expect(extractJsonColumnRefs('$input.first().json.input_text')).toEqual(['input_text']);
		});
		it('does not treat named node refs as direct input columns', () => {
			expect(extractJsonColumnRefs("={{ $('Source').item.json.user_query }}")).toEqual([]);
		});
		it('dedupes across patterns', () => {
			expect(extractJsonColumnRefs('$json.x and $input.item.json.x')).toEqual(['x']);
		});
		it('returns [] when no patterns match', () => {
			expect(extractJsonColumnRefs('plain text {{ $now }}')).toEqual([]);
		});
	});

	describe('extractNamedRefMatches', () => {
		it('extracts named refs from item, first, $items, $node dot, and bracket field access', () => {
			const text = [
				'={{ $("Quoted \\"Node\\"").first().json["field-key"] }}',
				"={{ $items('Other\\'s Node')[0].json.foo }}",
				'={{ $node.Source.item.json.bar }}',
				'={{ $node["Legacy"].json["baz qux"] }}',
			].join('\n');

			expect(extractNamedRefMatches(text)).toEqual([
				{
					nodeName: 'Quoted "Node"',
					field: 'field-key',
					originalExpression: '$("Quoted \\"Node\\"").first().json["field-key"]',
				},
				{
					nodeName: "Other's Node",
					field: 'foo',
					originalExpression: "$items('Other\\'s Node')[0].json.foo",
				},
				{
					nodeName: 'Source',
					field: 'bar',
					originalExpression: '$node.Source.item.json.bar',
				},
				{
					nodeName: 'Legacy',
					field: 'baz qux',
					originalExpression: '$node["Legacy"].json["baz qux"]',
				},
			]);
		});
	});

	describe('expression formatting', () => {
		it('formats field access with dot notation only when safe', () => {
			expect(currentJsonExpression('safe_name')).toBe('$json.safe_name');
			expect(currentJsonExpression('unsafe-name')).toBe('$json["unsafe-name"]');
		});

		it('escapes node names and field names for generated expressions', () => {
			expect(nodeItemJsonExpression('Voice "or" Text', 'message-id')).toBe(
				'$("Voice \\"or\\" Text").item.json["message-id"]',
			);
		});
	});
});
