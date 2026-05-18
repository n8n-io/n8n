import { collectStrings, extractJsonColumnRefs, extractNamedRefMatches } from '../column-ref-utils';

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
			expect(extractJsonColumnRefs('hello {{ $json["User Query"] }}')).toEqual(['User Query']);
		});
		it('extracts item.json.field references', () => {
			expect(extractJsonColumnRefs('{{ item.json.expected_response }}')).toEqual([
				'expected_response',
			]);
		});
		it('extracts item.json["field"] references', () => {
			expect(extractJsonColumnRefs('{{ item.json["expected-response"] }}')).toEqual([
				'expected-response',
			]);
		});
		it('extracts .item.json.field references', () => {
			expect(extractJsonColumnRefs('$input.item.json.input_text')).toEqual(['input_text']);
		});
		it('extracts .item.json["field"] references', () => {
			expect(extractJsonColumnRefs('$input.item.json["input text"]')).toEqual(['input text']);
		});
		it('dedupes across patterns', () => {
			expect(extractJsonColumnRefs('$json.x and item.json.x')).toEqual(['x']);
		});
		it('returns [] when no patterns match', () => {
			expect(extractJsonColumnRefs('plain text {{ $now }}')).toEqual([]);
		});
	});

	describe('extractNamedRefMatches', () => {
		it('extracts bracket field references from named node expressions', () => {
			expect(
				extractNamedRefMatches(
					'={{ $("Voice or Text").item.json["User Query"] }} {{ $node["Legacy"].json["legacy field"] }}',
				),
			).toEqual([
				{
					nodeName: 'Voice or Text',
					field: 'User Query',
					originalExpression: '$("Voice or Text").item.json["User Query"]',
				},
				{
					nodeName: 'Legacy',
					field: 'legacy field',
					originalExpression: '$node["Legacy"].json["legacy field"]',
				},
			]);
		});
	});
});
