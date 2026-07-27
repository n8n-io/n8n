import type { ManifestEntry } from '../../spec/manifest.schema';
import { deriveParentFolderId, foldersInScope, workflowsInScope } from '../package-layout';

const entry = (id: string, target: string): ManifestEntry => ({ id, name: id, target });

describe('package-layout', () => {
	describe('foldersInScope', () => {
		it('keeps the whole folders/ subtree at package root, dropping project-nested folders', () => {
			const entries = [
				entry('a', 'folders/a'),
				entry('b', 'folders/a/b'),
				entry('c', 'projects/x/folders/c'),
			];
			expect(foldersInScope(entries).map((e) => e.id)).toEqual(['a', 'b']);
		});

		it('scopes to a project prefix', () => {
			const entries = [
				entry('a', 'folders/a'),
				entry('c', 'projects/x/folders/c'),
				entry('d', 'projects/x/folders/c/d'),
			];
			expect(foldersInScope(entries, 'projects/x/').map((e) => e.id)).toEqual(['c', 'd']);
		});

		it('returns [] for undefined', () => {
			expect(foldersInScope(undefined)).toEqual([]);
		});
	});

	describe('workflowsInScope', () => {
		it('keeps loose and folder-nested workflows at package root, dropping project-nested', () => {
			const entries = [
				entry('top', 'workflows/top'),
				entry('inFolder', 'folders/a/workflows/inFolder'),
				entry('inProject', 'projects/x/workflows/inProject'),
			];
			expect(workflowsInScope(entries).map((e) => e.id)).toEqual(['top', 'inFolder']);
		});

		it('scopes to a project prefix (project-root and project-folder-nested)', () => {
			const entries = [
				entry('top', 'workflows/top'),
				entry('pRoot', 'projects/x/workflows/pRoot'),
				entry('pFolder', 'projects/x/folders/a/workflows/pFolder'),
			];
			expect(workflowsInScope(entries, 'projects/x/').map((e) => e.id)).toEqual([
				'pRoot',
				'pFolder',
			]);
		});
	});

	describe('deriveParentFolderId', () => {
		const map = new Map([
			['folders/a', 'A'],
			['folders/a/b', 'B'],
			['projects/x/folders/c', 'C'],
		]);

		it('returns null for a scope-root workflow', () => {
			expect(deriveParentFolderId('workflows/top', map)).toBeNull();
			expect(deriveParentFolderId('projects/x/workflows/root', map)).toBeNull();
		});

		it('resolves a folder-nested workflow to its folder id', () => {
			expect(deriveParentFolderId('folders/a/workflows/wf', map)).toBe('A');
			expect(deriveParentFolderId('folders/a/b/workflows/wf', map)).toBe('B');
			expect(deriveParentFolderId('projects/x/folders/c/workflows/wf', map)).toBe('C');
		});

		it('throws when a folder-nested workflow references a folder missing from the manifest', () => {
			expect(() => deriveParentFolderId('folders/missing/workflows/wf', map)).toThrow(
				/missing from the manifest/,
			);
		});

		it('returns null for a project-root workflow even when its project has no folder entry', () => {
			expect(deriveParentFolderId('projects/unknown/workflows/wf', map)).toBeNull();
		});

		it('splits on the LAST /workflows/ so a folder literally named "workflows" resolves correctly', () => {
			// A folder named "workflows" keeps its bare slug when its parent has no directly-contained
			// workflows; a workflow inside it must resolve to that folder, not its grandparent.
			const withWorkflowsFolder = new Map([
				['folders/a', 'A'],
				['folders/a/workflows', 'W'],
			]);
			expect(deriveParentFolderId('folders/a/workflows/workflows/wf', withWorkflowsFolder)).toBe(
				'W',
			);
			expect(deriveParentFolderId('folders/a/workflows/wf', withWorkflowsFolder)).toBe('A');
		});
	});
});
