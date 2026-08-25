import type { SourceControlledFile } from '@n8n/api-types';

import { paginateSourceControlledFiles } from '../source-controlled-file-pagination.service';

function file(overrides: Partial<SourceControlledFile>): SourceControlledFile {
	return {
		file: 'workflows/default.json',
		id: 'default-id',
		name: 'Default',
		type: 'workflow',
		status: 'modified',
		location: 'local',
		conflict: false,
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('paginateSourceControlledFiles', () => {
	describe('sorting', () => {
		it('sorts by type first', () => {
			const files = [
				file({ type: 'workflow', file: 'a', id: '1' }),
				file({ type: 'credential', file: 'a', id: '1' }),
			];

			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });

			expect(result.data.map((f) => f.type)).toEqual(['credential', 'workflow']);
		});

		it('sorts by file within the same type', () => {
			const files = [
				file({ type: 'workflow', file: 'b.json', id: '1' }),
				file({ type: 'workflow', file: 'a.json', id: '2' }),
			];

			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });

			expect(result.data.map((f) => f.file)).toEqual(['a.json', 'b.json']);
		});

		it('sorts by id when type and file are equal', () => {
			const files = [
				file({ type: 'workflow', file: 'a.json', id: '2' }),
				file({ type: 'workflow', file: 'a.json', id: '1' }),
			];

			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });

			expect(result.data.map((f) => f.id)).toEqual(['1', '2']);
		});

		it('produces the same order regardless of input order (stable across pages)', () => {
			const files = [
				file({ type: 'workflow', file: 'c.json', id: '3' }),
				file({ type: 'credential', file: 'a.json', id: '1' }),
				file({ type: 'workflow', file: 'a.json', id: '2' }),
			];
			const shuffled = [files[2], files[0], files[1]];

			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 3 });
			const shuffledResult = paginateSourceControlledFiles(shuffled, { offset: 0, limit: 3 });

			expect(result.data).toEqual(shuffledResult.data);
		});
	});

	describe('pagination', () => {
		const files = [
			file({ type: 'workflow', file: 'c.json', id: '3', name: 'C' }),
			file({ type: 'credential', file: 'a.json', id: '1', name: 'A' }),
			file({ type: 'workflow', file: 'a.json', id: '2', name: 'B' }),
		];

		it('sorts before slicing', () => {
			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });

			expect(result.data.map((f) => f.name)).toEqual(['A', 'B']);
		});

		it('returns a null nextCursor on the last page', () => {
			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 3 });

			expect(result.nextCursor).toBeNull();
		});

		it('returns a non-null nextCursor when more pages remain', () => {
			const result = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });

			expect(result.nextCursor).not.toBeNull();
		});

		it('paging through with the same page size covers every item exactly once', () => {
			const page1 = paginateSourceControlledFiles(files, { offset: 0, limit: 2 });
			const page2 = paginateSourceControlledFiles(files, { offset: 2, limit: 2 });

			expect(page2.nextCursor).toBeNull();
			expect([...page1.data, ...page2.data].map((f) => f.id)).toEqual(['1', '2', '3']);
		});
	});
});
