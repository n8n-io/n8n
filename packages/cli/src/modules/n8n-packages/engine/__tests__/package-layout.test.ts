import { VariableParentPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageVariableRequirement } from '../../spec/requirements.schema';
import type { SerializedVariable } from '../../spec/serialized/variable.schema';
import {
	deriveParentFolderId,
	foldersInScope,
	placeVariableRequirements,
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

	describe('placeVariableRequirements', () => {
		const named = (name: string, target: string): ManifestEntry => ({ id: name, name, target });
		const requirement = (name: string, value?: string): PackageVariableRequirement => ({
			name,
			usedByWorkflows: ['wf-1'],
			...(value !== undefined ? { value } : {}),
		});
		const place = (
			params: Partial<Parameters<typeof placeVariableRequirements>[0]> & {
				manifestVariables: ManifestEntry[];
				basePrefix: string;
			},
		) =>
			placeVariableRequirements({
				requirements: [requirement('API_URL')],
				placement: 'from-layout',
				...params,
			})![0];

		/** Project packages derive placement from the layout; read it back in the exporter's terms. */
		const scopeOf = (manifestVariables: ManifestEntry[], basePrefix: string, name = 'API_URL') =>
			place({ requirements: [requirement(name)], manifestVariables, basePrefix }).globalPlacement
				? 'global'
				: 'project';

		it('reads a top-level entry as global', () => {
			const entries = [named('SHARED_URL', 'variables/shared_url')];
			expect(scopeOf(entries, 'projects/x/', 'SHARED_URL')).toBe('global');
		});

		it('reads an entry bundled under the scope as project-scoped', () => {
			const entries = [named('API_URL', 'projects/x/variables/api_url')];
			expect(scopeOf(entries, 'projects/x/')).toBe('project');
		});

		it("prefers the scope's own entry over a top-level one of the same name", () => {
			const entries = [
				named('API_URL', 'variables/api_url'),
				named('API_URL', 'projects/x/variables/api_url'),
			];
			expect(scopeOf(entries, 'projects/x/')).toBe('project');
			// The other project sees only the top-level entry.
			expect(scopeOf(entries, 'projects/y/')).toBe('global');
		});

		it('falls back to the consuming project when the name is bundled under another project only', () => {
			const entries = [named('API_URL', 'projects/y/variables/api_url')];
			expect(scopeOf(entries, 'projects/x/')).toBe('project');
		});

		it('does not let one project prefix match another that shares its start', () => {
			const entries = [named('API_URL', 'projects/xy/variables/api_url')];
			expect(scopeOf(entries, 'projects/x/')).toBe('project');
		});

		it('rejects a package bundling the same name twice at the winning tier', () => {
			const entries = [
				named('API_URL', 'variables/api_url'),
				named('API_URL', 'variables/api_url_2'),
			];
			expect(() => scopeOf(entries, 'projects/x/')).toThrow(/ambiguous variable entries/);
		});

		it.each([
			[VariableParentPolicy.Project, false],
			[VariableParentPolicy.Global, true],
		])('follows the %s request policy instead of the layout', (placement, globalPlacement) => {
			// A top-level bundle would read as global from the layout; the policy overrides it.
			const entries = [named('API_URL', 'variables/api_url')];
			expect(place({ manifestVariables: entries, basePrefix: '', placement })).toMatchObject({
				globalPlacement,
			});
		});

		it("attaches the bundled variable's value for the winning entry", () => {
			const entries = [
				named('API_URL', 'variables/api_url'),
				named('API_URL', 'projects/x/variables/api_url'),
			];
			const bundledVariables = new Map<string, SerializedVariable>([
				['variables/api_url', { name: 'API_URL', type: 'string', value: 'global-value' }],
				[
					'projects/x/variables/api_url',
					{ name: 'API_URL', type: 'string', value: 'project-value' },
				],
			]);

			expect(
				place({ manifestVariables: entries, basePrefix: 'projects/x/', bundledVariables }),
			).toMatchObject({ packageValue: 'project-value' });
		});

		it('omits the value when the package bundles no file for the name', () => {
			const bundledVariables = new Map<string, SerializedVariable>([
				['variables/other', { name: 'OTHER', type: 'string', value: 'v' }],
			]);

			expect(
				place({ manifestVariables: [], basePrefix: 'projects/x/', bundledVariables }),
			).not.toHaveProperty('packageValue');
		});

		it('omits the value when the exported file carries none', () => {
			const entries = [named('API_URL', 'variables/api_url')];
			const bundledVariables = new Map<string, SerializedVariable>([
				['variables/api_url', { name: 'API_URL', type: 'string' }],
			]);

			expect(
				place({ manifestVariables: entries, basePrefix: 'projects/x/', bundledVariables }),
			).not.toHaveProperty('packageValue');
		});

		it('returns undefined when the package declares no variable requirements', () => {
			expect(
				placeVariableRequirements({
					requirements: undefined,
					manifestVariables: [],
					basePrefix: '',
					placement: 'from-layout',
				}),
			).toBeUndefined();
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
