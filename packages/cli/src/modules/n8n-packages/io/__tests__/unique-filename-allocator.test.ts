import { UniqueFilenameAllocator } from '../unique-filename-allocator';

describe('UniqueFilenameAllocator', () => {
	it('returns the slugged base path on first allocation', () => {
		const allocator = new UniqueFilenameAllocator('workflows', 'workflow');

		expect(allocator.allocate('My Workflow')).toBe('workflows/my-workflow');
	});

	it('suffixes -2 when a slug collides with an earlier allocation', () => {
		const allocator = new UniqueFilenameAllocator('workflows', 'workflow');

		allocator.allocate('Same Name');
		expect(allocator.allocate('Same Name')).toBe('workflows/same-name-2');
	});

	it('keeps incrementing the suffix until it finds a free slot', () => {
		const allocator = new UniqueFilenameAllocator('workflows', 'workflow');

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
		const a = new UniqueFilenameAllocator('workflows', 'workflow');
		const b = new UniqueFilenameAllocator('workflows', 'workflow');

		expect(a.allocate('Same Name')).toBe('workflows/same-name');
		expect(b.allocate('Same Name')).toBe('workflows/same-name');
	});

	it('suffixes a name that slugifies to a reserved segment', () => {
		// the word "workflows" needs to be protected otherwise you could create a workflow
		// with the name "workflows" and overwrite the "workflows" directory of the folder
		const allocator = new UniqueFilenameAllocator('folders/in-progress', 'folder');
		allocator.reserve('workflows');

		expect(allocator.allocate('Workflows')).toBe('folders/in-progress/workflows-2');
	});
});
