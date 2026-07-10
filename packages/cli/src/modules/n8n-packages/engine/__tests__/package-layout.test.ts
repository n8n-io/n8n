import type { ManifestEntry } from '../../spec/manifest.schema';
import { isTopLevelTarget, topLevelFolders, topLevelWorkflows } from '../package-layout';

const entry = (id: string, target: string): ManifestEntry => ({ id, name: id, target });

describe('package-layout', () => {
	describe('isTopLevelTarget', () => {
		it('treats a direct child of the dir as top-level', () => {
			expect(isTopLevelTarget('folders/a', 'folders')).toBe(true);
			expect(isTopLevelTarget('workflows/wf', 'workflows')).toBe(true);
		});

		it('treats a nested folder tree entry as top-level (folders/ appears once per scope)', () => {
			expect(isTopLevelTarget('folders/a/b', 'folders')).toBe(true);
		});

		it('rejects project-nested entries', () => {
			expect(isTopLevelTarget('projects/x/folders/a', 'folders')).toBe(false);
			expect(isTopLevelTarget('projects/x/workflows/wf', 'workflows')).toBe(false);
		});

		it('rejects folder-nested workflows', () => {
			expect(isTopLevelTarget('folders/a/workflows/wf', 'workflows')).toBe(false);
		});
	});

	describe('topLevelFolders', () => {
		it('keeps only folders/… entries and drops project-nested ones', () => {
			const entries = [
				entry('a', 'folders/a'),
				entry('b', 'folders/a/b'),
				entry('c', 'projects/x/folders/c'),
			];
			expect(topLevelFolders(entries).map((e) => e.id)).toEqual(['a', 'b']);
		});

		it('returns [] for undefined', () => {
			expect(topLevelFolders(undefined)).toEqual([]);
		});
	});

	describe('topLevelWorkflows', () => {
		it('keeps only workflows/… entries and drops folder/project-nested ones', () => {
			const entries = [
				entry('top', 'workflows/top'),
				entry('inFolder', 'folders/a/workflows/inFolder'),
				entry('inProject', 'projects/x/workflows/inProject'),
			];
			expect(topLevelWorkflows(entries).map((e) => e.id)).toEqual(['top']);
		});
	});
});
