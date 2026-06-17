import { UniqueFilenameAllocator } from '../unique-filename-allocator';

describe('UniqueFilenameAllocator', () => {
	it('returns the slugged base path on first allocation', () => {
		const allocator = new UniqueFilenameAllocator('workflows');

		expect(allocator.allocate('My Workflow')).toBe('workflows/my-workflow');
	});

	it('suffixes -2 when a slug collides with an earlier allocation', () => {
		const allocator = new UniqueFilenameAllocator('workflows');

		allocator.allocate('Same Name');
		expect(allocator.allocate('Same Name')).toBe('workflows/same-name-2');
	});

	it('keeps incrementing the suffix until it finds a free slot', () => {
		const allocator = new UniqueFilenameAllocator('workflows');

		allocator.allocate('Same Name');
		allocator.allocate('Same Name');
		expect(allocator.allocate('Same Name')).toBe('workflows/same-name-3');
	});

	it('uses the supplied fallback when the name slugifies to an empty string', () => {
		const allocator = new UniqueFilenameAllocator('credentials', 'credential');

		expect(allocator.allocate('!!!')).toBe('credentials/credential');
	});

	it('suffixes the fallback when two unslugifiable names collide', () => {
		// Two credentials named entirely with stripped characters both
		// fall back to the same slug; the second one must still get a
		// unique target rather than overwriting the first.
		const allocator = new UniqueFilenameAllocator('credentials', 'credential');

		expect(allocator.allocate('!!!')).toBe('credentials/credential');
		expect(allocator.allocate('???')).toBe('credentials/credential-2');
	});

	it('keeps the per-instance used set independent across allocators', () => {
		const a = new UniqueFilenameAllocator('workflows');
		const b = new UniqueFilenameAllocator('workflows');

		expect(a.allocate('Same Name')).toBe('workflows/same-name');
		expect(b.allocate('Same Name')).toBe('workflows/same-name');
	});
});
