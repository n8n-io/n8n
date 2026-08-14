import { startTestRunPayloadSchema } from '../evaluations.schema';

describe('startTestRunPayloadSchema', () => {
	describe('rowIndices', () => {
		it('accepts a payload without rowIndices (field is optional)', () => {
			const result = startTestRunPayloadSchema.safeParse({ concurrency: 1 });
			expect(result.success).toBe(true);
			expect(result.data?.rowIndices).toBeUndefined();
		});

		it('accepts a payload with an empty rowIndices array', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: [] });
			expect(result.success).toBe(true);
			expect(result.data?.rowIndices).toEqual([]);
		});

		it('accepts valid 0-based integer indices', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: [0, 1, 7, 99] });
			expect(result.success).toBe(true);
			expect(result.data?.rowIndices).toEqual([0, 1, 7, 99]);
		});

		it('accepts rowIndices alongside other fields', () => {
			const result = startTestRunPayloadSchema.safeParse({
				concurrency: 2,
				evaluationConfigId: 'cfg-abc',
				rowIndices: [3, 5],
			});
			expect(result.success).toBe(true);
			expect(result.data?.rowIndices).toEqual([3, 5]);
			expect(result.data?.concurrency).toBe(2);
		});

		it('rejects negative indices (min: 0)', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: [-1] });
			expect(result.success).toBe(false);
		});

		it('rejects non-integer indices', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: [1.5] });
			expect(result.success).toBe(false);
		});

		it('rejects non-numeric values in the array', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: ['a'] });
			expect(result.success).toBe(false);
		});

		it('rejects rowIndices when not an array', () => {
			const result = startTestRunPayloadSchema.safeParse({ rowIndices: 5 });
			expect(result.success).toBe(false);
		});
	});
});
