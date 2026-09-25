import type { ManifestEntry } from '../../spec/manifest.schema';
import type { SerializedVariable } from '../../spec/serialized/variable.schema';
import {
	deriveParentFolderId,
	foldersInScope,
	placeByLayout,
	workflowsInScope,
} from '../package-layout';

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

	describe('variable placement', () => {
		const named = (name: string, target: string): ManifestEntry => ({ id: name, name, target });
		const placedIn = (
			manifestVariables: ManifestEntry[],
			scopePrefix: string,
			bundledVariables?: Map<string, SerializedVariable>,
		) =>
			placeByLayout({
				requirements: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				manifestVariables,
				scopePrefix,
				bundledVariables,
			})![0];
		const scopeOf = (manifestVariables: ManifestEntry[], scopePrefix: string) =>
			placedIn(manifestVariables, scopePrefix).globalPlacement ? 'global' : 'project';

		// A requirement names a variable, never a path, so both files answer to it. Hand-made only.
		it('rejects two files claiming one name in the same directory', () => {
			const entries = [
				named('API_URL', 'variables/api_url'),
				named('API_URL', 'variables/api_url_2'),
			];
			expect(() => scopeOf(entries, '')).toThrow(/ambiguous variable entries/);
		});

		it('gives each project its own file when two projects bundle one name', () => {
			const entries = [
				named('API_URL', 'projects/cheddar/variables/api_url'),
				named('API_URL', 'projects/brie/variables/api_url'),
			];
			const bundled = new Map<string, SerializedVariable>([
				[
					'projects/cheddar/variables/api_url',
					{ name: 'API_URL', type: 'string', value: 'cheddar' },
				],
				['projects/brie/variables/api_url', { name: 'API_URL', type: 'string', value: 'brie' }],
			]);

			expect(placedIn(entries, 'projects/cheddar/', bundled)).toMatchObject({
				globalPlacement: false,
				packageValue: 'cheddar',
			});
			expect(placedIn(entries, 'projects/brie/', bundled)).toMatchObject({
				globalPlacement: false,
				packageValue: 'brie',
			});
		});

		it('does not let one project prefix match another that shares its start', () => {
			expect(scopeOf([named('API_URL', 'projects/xy/variables/api_url')], 'projects/x/')).toBe(
				'project',
			);
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
