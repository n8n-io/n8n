import {
	collectStrings,
	extractJsonColumnRefs,
	isRecord,
	nodeHasName,
	nodeTypeEndsWith,
	unique,
} from '../column-ref-utils';

describe('column-ref-utils', () => {
	describe('isRecord', () => {
		it('returns true for plain objects', () => {
			expect(isRecord({})).toBe(true);
			expect(isRecord({ a: 1 })).toBe(true);
		});
		it('returns false for null, arrays, and primitives', () => {
			expect(isRecord(null)).toBe(false);
			expect(isRecord([])).toBe(false);
			expect(isRecord('s')).toBe(false);
			expect(isRecord(42)).toBe(false);
		});
	});

	describe('unique', () => {
		it('dedupes and drops empty strings', () => {
			expect(unique(['a', 'b', 'a', '', 'c'])).toEqual(['a', 'b', 'c']);
		});
	});

	describe('collectStrings', () => {
		it('walks nested objects and arrays', () => {
			const v = { a: 'x', b: ['y', { c: 'z' }] };
			expect(collectStrings(v).sort()).toEqual(['x', 'y', 'z']);
		});
		it('returns [] for null', () => {
			expect(collectStrings(null)).toEqual([]);
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

	describe('nodeTypeEndsWith', () => {
		it('matches exact type', () => {
			expect(nodeTypeEndsWith({ type: 'set' } as any, 'set')).toBe(true);
		});
		it('matches dotted suffix', () => {
			expect(nodeTypeEndsWith({ type: 'n8n-nodes-base.set' } as any, 'set')).toBe(true);
		});
		it('does not match unrelated suffixes', () => {
			expect(nodeTypeEndsWith({ type: 'n8n-nodes-base.setX' } as any, 'set')).toBe(false);
		});
	});

	describe('nodeHasName', () => {
		it('narrows to nodes with non-empty string name', () => {
			expect(nodeHasName({ name: 'Foo' } as any)).toBe(true);
			expect(nodeHasName({ name: '' } as any)).toBe(false);
			expect(nodeHasName({} as any)).toBe(false);
		});
	});
});
