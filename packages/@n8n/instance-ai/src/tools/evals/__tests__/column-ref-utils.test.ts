import {
	collectStrings,
	currentJsonExpression,
	currentJsonPathExpression,
	extractDirectJsonColumnRefs,
	extractDirectJsonRefMatches,
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
		it('keeps nested $json paths distinct', () => {
			expect(extractJsonColumnRefs('{{ $json.message.chat.id }} {{ $json.message.text }}')).toEqual(
				['message.chat.id', 'message.text'],
			);
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

	describe('extractDirectJsonColumnRefs', () => {
		it('extracts direct $json and $input.item.json references', () => {
			expect(
				extractDirectJsonColumnRefs(
					'{{ $json.user_query }} and {{ $input.item.json.context }}',
				).sort(),
			).toEqual(['context', 'user_query']);
		});

		it('extracts direct nested refs with original expressions', () => {
			expect(
				extractDirectJsonRefMatches(
					'{{ $json.message.text }} {{ $input.item.json.message.chat.id }}',
				),
			).toEqual([
				{
					field: 'message.text',
					path: ['message', 'text'],
					originalExpression: '$json.message.text',
				},
				{
					field: 'message.chat.id',
					path: ['message', 'chat', 'id'],
					originalExpression: '$input.item.json.message.chat.id',
				},
			]);
		});

		it('preserves quoted dotted fields as single path segments', () => {
			expect(extractDirectJsonRefMatches('{{ $json["message.text"] }}')).toEqual([
				{
					field: 'message.text',
					path: ['message.text'],
					originalExpression: '$json["message.text"]',
				},
			]);
		});

		it('extracts bracket field references from direct $json access', () => {
			expect(extractDirectJsonColumnRefs('hello {{ $json["user-input"] }}')).toEqual([
				'user-input',
			]);
		});

		it('ignores named-node refs', () => {
			expect(extractDirectJsonColumnRefs("{{ $('Voice').item.json.text }}")).toEqual([]);
		});
	});

	describe('extractNamedRefMatches', () => {
		it('extracts named refs from item, first, $items, $node dot, and bracket field access', () => {
			const text = [
				'={{ $("Quoted \\"Node\\"").first().json["field-key"] }}',
				"={{ $items('Other\\'s Node')[0].json.foo }}",
				'={{ $node.Source.item.json.bar.nested }}',
				'={{ $node["Legacy"].json["baz qux"] }}',
			].join('\n');

			expect(extractNamedRefMatches(text)).toEqual([
				{
					nodeName: 'Quoted "Node"',
					field: 'field-key',
					path: ['field-key'],
					originalExpression: '$("Quoted \\"Node\\"").first().json["field-key"]',
				},
				{
					nodeName: "Other's Node",
					field: 'foo',
					path: ['foo'],
					originalExpression: "$items('Other\\'s Node')[0].json.foo",
				},
				{
					nodeName: 'Source',
					field: 'bar.nested',
					path: ['bar', 'nested'],
					originalExpression: '$node.Source.item.json.bar.nested',
				},
				{
					nodeName: 'Legacy',
					field: 'baz qux',
					path: ['baz qux'],
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

		it('formats nested source paths for production adapter assignments', () => {
			expect(currentJsonPathExpression(['message', 'chat', 'id'])).toBe('$json.message.chat.id');
		});

		it('keeps quoted dotted source fields intact when formatting path expressions', () => {
			expect(currentJsonPathExpression(['message.text'])).toBe('$json["message.text"]');
		});

		it('escapes node names and field names for generated expressions', () => {
			expect(nodeItemJsonExpression('Voice "or" Text', ['message', 'chat', 'id'])).toBe(
				'$("Voice \\"or\\" Text").item.json.message.chat.id',
			);
			expect(nodeItemJsonExpression('Source', ['message.text'])).toBe(
				'$("Source").item.json["message.text"]',
			);
		});
	});
});
