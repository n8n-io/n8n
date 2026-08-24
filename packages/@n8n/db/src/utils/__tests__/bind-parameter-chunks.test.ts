import { idChunks } from '../bind-parameter-chunks';

describe('idChunks', () => {
	it('returns no chunks for an empty list', () => {
		expect(idChunks([])).toEqual([]);
	});

	it('returns a single chunk when the list is exactly the chunk size', () => {
		const ids = Array.from({ length: 10 }, (_, i) => `id-${i}`);

		expect(idChunks(ids, 10)).toEqual([ids]);
	});

	it('splits a list larger than the chunk size', () => {
		expect(idChunks(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
	});

	it('rejects an invalid chunk size', () => {
		expect(() => idChunks(['a'], 0)).toThrow('ID chunk size must be a positive integer');
	});

	it('stays under the SQLite bind-parameter ceiling for three parameters per id', () => {
		const ids = Array.from({ length: 100_000 }, (_, i) => `id-${i}`);

		for (const chunk of idChunks(ids)) {
			expect(chunk.length * 3 + 6).toBeLessThan(32_766);
		}
	});
});
