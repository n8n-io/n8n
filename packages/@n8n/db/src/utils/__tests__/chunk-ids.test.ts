import { chunkIds } from '../chunk-ids';

const SQLITE_MAX_BIND_PARAMETERS = 32_766;
const MAX_BINDS_PER_ID = 3;
const FIXED_BIND_PARAMETERS = 6;

describe('chunkIds', () => {
	it('keeps query batches within the SQLite bind-parameter limit', () => {
		const ids = Array.from({ length: 100_000 }, (_, index) => `id-${index}`);
		const chunks = chunkIds(ids);

		expect(chunks.flat()).toEqual(ids);
		for (const chunk of chunks) {
			expect(chunk.length * MAX_BINDS_PER_ID + FIXED_BIND_PARAMETERS).toBeLessThanOrEqual(
				SQLITE_MAX_BIND_PARAMETERS,
			);
		}
	});
});
