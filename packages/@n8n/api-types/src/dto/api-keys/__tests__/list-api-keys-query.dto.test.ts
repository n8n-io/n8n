import { ListApiKeysQueryDto } from '../list-api-keys-query.dto';

const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

describe('ListApiKeysQueryDto', () => {
	describe('ownerIds', () => {
		it('splits a comma-separated string, trimming blanks and empties', () => {
			const result = ListApiKeysQueryDto.safeParse({ ownerIds: 'a, ,b, c,' });

			expect(result.success).toBe(true);
			expect(result.data?.ownerIds).toEqual(['a', 'b', 'c']);
		});

		it.each([
			['absent', {}],
			['empty string', { ownerIds: '' }],
		])('is undefined when %s', (_label, data) => {
			const result = ListApiKeysQueryDto.safeParse(data);

			expect(result.success).toBe(true);
			expect(result.data?.ownerIds).toBeUndefined();
		});

		it('accepts the full population of 100 UUID owners', () => {
			// 100 UUIDs (36 chars each) comma-joined is 3699 chars — this must pass,
			// i.e. the raw length guard cannot sit below the parsed 100-id limit.
			const ids = Array.from({ length: 100 }, (_, i) => uuid(i));
			const result = ListApiKeysQueryDto.safeParse({ ownerIds: ids.join(',') });

			expect(result.success).toBe(true);
			expect(result.data?.ownerIds).toHaveLength(100);
		});

		it('rejects more than 100 owners', () => {
			const ids = Array.from({ length: 101 }, (_, i) => uuid(i));
			const result = ListApiKeysQueryDto.safeParse({ ownerIds: ids.join(',') });

			expect(result.success).toBe(false);
		});
	});
});
