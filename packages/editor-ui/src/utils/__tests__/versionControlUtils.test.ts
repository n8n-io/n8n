import type { VersionControlStatus } from '@/Interface';
import { beforeEach } from 'vitest';
import { aggregateVersionControlFiles } from '@/utils';

describe('versionControlUtils', () => {
	describe('aggregateVersionControlFiles()', () => {
		let status: VersionControlStatus;

		beforeEach(() => {
			status = {
				ahead: 0,
				behind: 0,
				conflicted: [],
				created: [],
				current: 'main',
				deleted: [],
				detached: false,
				files: [],
				modified: [],
				not_added: [],
				renamed: [],
				staged: [],
				tracking: null,
			};
		});

		it('should be empty array if no files', () => {
			expect(aggregateVersionControlFiles(status)).toEqual([]);
		});

		it('should contain list of conflicted, created, deleted, modified, and renamed files', () => {
			status.files = [
				{ path: 'conflicted.json', index: 'A', working_dir: '' },
				{ path: 'created.json', index: 'A', working_dir: '' },
				{ path: 'deleted.json', index: 'A', working_dir: '' },
				{ path: 'modified.json', index: 'A', working_dir: '' },
				{ path: 'renamed.json', index: 'A', working_dir: '' },
			];

			status.conflicted.push('conflicted.json');
			status.created.push('created.json');
			status.deleted.push('deleted.json');
			status.modified.push('modified.json');
			status.renamed.push('renamed.json');
			status.staged = status.files.map((file) => file.path);

			expect(aggregateVersionControlFiles(status)).toEqual([
				{ path: 'conflicted.json', status: 'conflicted', staged: true },
				{ path: 'created.json', status: 'created', staged: true },
				{ path: 'deleted.json', status: 'deleted', staged: true },
				{ path: 'modified.json', status: 'modified', staged: true },
				{ path: 'renamed.json', status: 'renamed', staged: true },
			]);
		});
	});
});
