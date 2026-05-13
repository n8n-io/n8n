import { collectStrings, extractJsonColumnRefs } from '../column-ref-utils';

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
		it('extracts item.json.field references', () => {
			expect(extractJsonColumnRefs('{{ item.json.expected_response }}')).toEqual([
				'expected_response',
			]);
		});
		it('extracts .item.json.field references', () => {
			expect(extractJsonColumnRefs('$input.item.json.input_text')).toEqual(['input_text']);
		});
		it('dedupes across patterns', () => {
			expect(extractJsonColumnRefs('$json.x and item.json.x')).toEqual(['x']);
		});
		it('returns [] when no patterns match', () => {
			expect(extractJsonColumnRefs('plain text {{ $now }}')).toEqual([]);
		});
	});
});
