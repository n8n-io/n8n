import type { InstanceSettings } from 'n8n-core';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { CredentialRequirementsExtractor } from '@/modules/n8n-packages/entities/credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '@/modules/n8n-packages/entities/data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import { WorkflowSerializer } from '@/modules/n8n-packages/entities/workflow/workflow.serializer';
import { PackageContentsReader } from '@/modules/n8n-packages/engine/package-contents';
import type { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import type { BranchState } from '../branch-placement';
import { WorkingCopyUpdater } from '../working-copy-updater';
import type { SelectivePushOptions } from '../working-copy-updater';

const packageImportConfig = mock<PackageImportConfig>({
	maxUncompressedBytes: 300 * 1024 * 1024,
	maxEntryBytes: 5 * 1024 * 1024,
	maxEntries: 5_000,
	maxPathLength: 1024,
});

const baseMetadata = {
	packageFormatVersion: '1' as const,
	exportedAt: '2026-01-01T00:00:00.000Z',
	sourceN8nVersion: '1.0.0',
	sourceId: 'inst-1',
};

const makeManifest = (overrides: Partial<PackageManifest> = {}): PackageManifest => ({
	...baseMetadata,
	...overrides,
});

const alpha = { id: 'p1', name: 'Alpha', target: 'projects/alpha' };
const wf = (id: string) => ({
	id,
	name: id.toUpperCase(),
	target: `projects/alpha/workflows/${id}`,
});
const folder = (id: string, name: string, slug: string) => ({
	id,
	name,
	target: `projects/alpha/folders/${slug}`,
});
const inFolder = (id: string, slug: string) => ({
	id,
	name: id.toUpperCase(),
	target: `projects/alpha/folders/${slug}/workflows/${id}`,
});
const cred = (id: string) => ({ id, name: id, target: `projects/alpha/credentials/${id}` });
const credReq = (id: string, usedByWorkflows: string[]) => ({
	id,
	name: id,
	type: CREDENTIAL_TYPE,
	usedByWorkflows,
});

// The files an export writes. Their ids and names are what the branch state is
// read from, so they must agree with the entry helpers above.
const projectFile = JSON.stringify({ id: alpha.id, name: alpha.name });
const folderFile = (id: string, name: string) => JSON.stringify({ id, name });
const workflowFile = (id: string, extra: Record<string, unknown> = {}) =>
	JSON.stringify({
		id,
		name: id.toUpperCase(),
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...extra,
	});

const CREDENTIAL_TYPE = 'httpBasicAuth';
const NODE_TYPE = 'n8n-nodes-base.httpRequest';

/** A workflow whose nodes use `credentialIds`, so the branch shows who needs what. */
const workflowUsing = (id: string, credentialIds: string[]) =>
	workflowFile(id, {
		nodes: credentialIds.map((credentialId, index) => ({
			id: `${id}-n${index}`,
			name: `Call ${index}`,
			type: NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { [CREDENTIAL_TYPE]: { id: credentialId, name: credentialId } },
		})),
	});
const credentialFile = (id: string) => JSON.stringify({ id, name: id });

const selection = (overrides: Partial<SelectivePushOptions> = {}): SelectivePushOptions => ({
	projectId: 'p1',
	workflowIds: [],
	deletedWorkflowIds: [],
	...overrides,
});

describe('WorkingCopyUpdater', () => {
	let root: string;
	let exportFolder: string;
	let stagingFolder: string;
	const updater = new WorkingCopyUpdater(
		mock<InstanceSettings>({ instanceId: 'inst-1' }),
		packageImportConfig,
		new PackageContentsReader(
			new WorkflowSerializer(),
			new CredentialRequirementsExtractor(),
			new DataTableRequirementsExtractor(),
			new VariableRequirementsExtractor(),
		),
	);

	const writeTree = async (base: string, files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(base, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};
	const manifestFile = (manifest: PackageManifest) => JSON.stringify(manifest);
	const readExported = async (relative: string) =>
		await readFile(path.join(exportFolder, relative), 'utf-8');
	const expectAbsent = async (relative: string) =>
		await expect(stat(path.join(exportFolder, relative))).rejects.toThrow();

	/**
	 * Write the branch and the staging export, then apply the selection. The
	 * branch manifest carries no entries: they are read from the directories.
	 */
	const apply = async (
		branchFiles: Record<string, string>,
		staging: PackageManifest,
		stagingFiles: Record<string, string>,
		{
			deleted = [],
			branchManifest = makeManifest(),
		}: { deleted?: string[]; branchManifest?: PackageManifest } = {},
	) => {
		await writeTree(exportFolder, {
			'manifest.json': manifestFile(branchManifest),
			...branchFiles,
		});
		await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging), ...stagingFiles });
		const branch = await updater.readBranchState(exportFolder);
		return await updater.applySelection(
			exportFolder,
			stagingFolder,
			staging,
			branch,
			new Set(deleted),
		);
	};

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-working-copy-'));
		exportFolder = path.join(root, 'repository', 'n8n-export');
		stagingFolder = path.join(root, 'staging');
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	describe('validateSelection', () => {
		it('rejects an empty selection', () => {
			expect(() => updater.validateSelection(selection())).toThrow(
				'At least one workflow must be selected or deleted',
			);
		});

		it('rejects duplicate workflowIds', () => {
			expect(() => updater.validateSelection(selection({ workflowIds: ['w1', 'w1'] }))).toThrow(
				'workflowIds contains duplicates',
			);
		});

		it('rejects duplicate deletedWorkflowIds', () => {
			expect(() =>
				updater.validateSelection(selection({ deletedWorkflowIds: ['w1', 'w1'] })),
			).toThrow('deletedWorkflowIds contains duplicates');
		});

		it('rejects a workflow that is both selected and deleted', () => {
			expect(() =>
				updater.validateSelection(selection({ workflowIds: ['w1'], deletedWorkflowIds: ['w1'] })),
			).toThrow('A workflow cannot be both selected and deleted in the same push');
		});
	});

	describe('readBranchState', () => {
		it('reads one entry for each entity from the directories', async () => {
			await writeTree(exportFolder, {
				// The manifest states nothing: the files carry all of it.
				'manifest.json': manifestFile(makeManifest()),
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowUsing('w1', ['c1']),
				'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch.projects).toEqual([alpha]);
			expect(branch.workflows).toEqual([wf('w1')]);
			expect(branch.credentials).toEqual([cred('c1')]);
		});

		it('rejects a workflow file that fails validation, before the push writes anything', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ name: 'no id' }),
			});

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				'Package holds a workflow file that failed validation at "projects/alpha/workflows/w1"',
			);
		});

		it('keeps the variable ids the manifest knows, because the files omit them', async () => {
			const target = 'projects/alpha/variables/api-key';
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(
					makeManifest({ variables: [{ id: 'v1', name: 'API_KEY', target }] }),
				),
				[`${target}/variable.json`]: JSON.stringify({ name: 'API_KEY', type: 'string' }),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch.variables).toEqual([{ id: 'v1', name: 'API_KEY', target }]);
		});

		it('works on a branch that has no manifest at all', async () => {
			await writeTree(exportFolder, {
				'projects/alpha/project.json': projectFile,
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});

			const branch = await updater.readBranchState(exportFolder);

			expect(branch.workflows).toEqual([wf('w1')]);
		});
	});

	describe('assertDeletionsOnBranch', () => {
		it('rejects deletes of workflows that are not on the branch', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w-unknown'] })),
			).toThrow('Deleted workflows not found on the branch: w-unknown');
		});

		it('rejects deletes of workflows that belong to another project', () => {
			const other = { id: 'w-other', name: 'WOther', target: 'projects/beta/workflows/w-other' };
			const branch: BranchState = {
				workflows: [wf('w1'), other],
				projects: [alpha, { id: 'p2', name: 'Beta', target: 'projects/beta' }],
			};

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w-other'] })),
			).toThrow('Deleted workflows do not belong to the selected project: w-other');
		});

		it('accepts deletes of workflows under the selected project', () => {
			const branch: BranchState = { workflows: [wf('w1')], projects: [alpha] };

			expect(() =>
				updater.assertDeletionsOnBranch(branch, selection({ deletedWorkflowIds: ['w1'] })),
			).not.toThrow();
		});
	});

	describe('applySelection', () => {
		it('keeps a renamed folder where the branch has it, so unselected workflows stay put', async () => {
			await apply(
				{
					'projects/alpha/project.json': projectFile,
					'projects/alpha/folders/sales/folder.json': folderFile('f1', 'Sales'),
					'projects/alpha/folders/sales/workflows/w1/workflow.json': workflowFile('w1', { v: 1 }),
					'projects/alpha/folders/sales/workflows/w2/workflow.json': workflowFile('w2'),
					'projects/alpha/folders/sales/workflows/w3/workflow.json': workflowFile('w3'),
				},
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'Revenue', 'revenue')],
					workflows: [inFolder('w1', 'revenue')],
				}),
				{
					'projects/alpha/project.json': projectFile,
					'projects/alpha/folders/revenue/folder.json': folderFile('f1', 'Revenue'),
					'projects/alpha/folders/revenue/workflows/w1/workflow.json': workflowFile('w1', { v: 2 }),
				},
				{ deleted: ['w3'] },
			);

			await expectAbsent('projects/alpha/folders/revenue');
			await expectAbsent('projects/alpha/folders/sales/workflows/w3');
			// The folder was renamed on the instance, but nobody selected that change.
			expect(await readExported('projects/alpha/folders/sales/folder.json')).toBe(
				folderFile('f1', 'Sales'),
			);
			expect(await readExported('projects/alpha/folders/sales/workflows/w1/workflow.json')).toBe(
				workflowFile('w1', { v: 2 }),
			);
			expect(await readExported('projects/alpha/folders/sales/workflows/w2/workflow.json')).toBe(
				workflowFile('w2'),
			);
			const manifest = await updater.readManifest(exportFolder);
			expect(manifest.folders).toEqual([folder('f1', 'Sales', 'sales')]);
			// Sorted by directory, because the manifest restates the tree.
			expect(manifest.workflows).toEqual([inFolder('w1', 'sales'), inFolder('w2', 'sales')]);
		});

		it('keeps both folders where the branch has them when their names swap', async () => {
			// f1 is now named B (slug b) and f2 is named A (slug a); w1 and w3 are selected.
			await apply(
				{
					'projects/alpha/folders/a/folder.json': folderFile('f1', 'A'),
					'projects/alpha/folders/b/folder.json': folderFile('f2', 'B'),
					'projects/alpha/folders/a/workflows/w1/workflow.json': workflowFile('w1'),
					'projects/alpha/folders/a/workflows/w2/workflow.json': workflowFile('w2'),
					'projects/alpha/folders/b/workflows/w3/workflow.json': workflowFile('w3'),
					'projects/alpha/folders/b/workflows/w4/workflow.json': workflowFile('w4'),
				},
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'B', 'b'), folder('f2', 'A', 'a')],
					workflows: [inFolder('w1', 'b'), inFolder('w3', 'a')],
				}),
				{
					'projects/alpha/folders/b/folder.json': folderFile('f1', 'B'),
					'projects/alpha/folders/a/folder.json': folderFile('f2', 'A'),
					'projects/alpha/folders/b/workflows/w1/workflow.json': workflowFile('w1', {
						moved: true,
					}),
					'projects/alpha/folders/a/workflows/w3/workflow.json': workflowFile('w3', {
						moved: true,
					}),
				},
			);

			// Each selected workflow lands in the directory its folder has on the
			// branch, next to the siblings nobody selected.
			const tree: Record<string, string> = {
				'projects/alpha/folders/a/folder.json': folderFile('f1', 'A'),
				'projects/alpha/folders/b/folder.json': folderFile('f2', 'B'),
				'projects/alpha/folders/a/workflows/w1/workflow.json': workflowFile('w1', { moved: true }),
				'projects/alpha/folders/a/workflows/w2/workflow.json': workflowFile('w2'),
				'projects/alpha/folders/b/workflows/w3/workflow.json': workflowFile('w3', { moved: true }),
				'projects/alpha/folders/b/workflows/w4/workflow.json': workflowFile('w4'),
			};
			for (const [file, content] of Object.entries(tree)) {
				expect(await readExported(file), file).toBe(content);
			}
			const manifest = await updater.readManifest(exportFolder);
			expect(manifest.workflows!.map((w) => w.target).sort()).toEqual(
				Object.keys(tree)
					.filter((f) => f.endsWith('workflow.json'))
					.map((f) => path.dirname(f))
					.sort(),
			);
		});

		it('ignores a workflow that the manifest lists but the branch no longer holds', async () => {
			// The old behaviour aborted the push here, because the manifest drove
			// the reconciliation. The directories decide now, so w2 is simply not
			// on the branch.
			const merged = await apply(
				{
					'projects/alpha/folders/sales/folder.json': folderFile('f1', 'Sales'),
					'projects/alpha/folders/sales/workflows/w1/workflow.json': workflowFile('w1'),
				},
				makeManifest({
					projects: [alpha],
					folders: [folder('f1', 'Revenue', 'revenue')],
					workflows: [inFolder('w1', 'revenue')],
				}),
				{
					'projects/alpha/folders/revenue/folder.json': folderFile('f1', 'Revenue'),
					'projects/alpha/folders/revenue/workflows/w1/workflow.json': workflowFile('w1'),
				},
				{
					branchManifest: makeManifest({
						folders: [folder('f1', 'Sales', 'sales')],
						workflows: [inFolder('w1', 'sales'), inFolder('w2', 'sales')],
					}),
				},
			);

			expect(merged.workflows).toEqual([inFolder('w1', 'sales')]);
			await expectAbsent('projects/alpha/folders/revenue');
		});

		it('removes a dependency directory once its last user dropped it', async () => {
			const merged = await apply(
				{
					'projects/alpha/project.json': projectFile,
					// On the branch w1 still uses both; the push re-exports it with one.
					'projects/alpha/workflows/w1/workflow.json': workflowUsing('w1', ['c1', 'c-old']),
					'projects/alpha/workflows/w2/workflow.json': workflowFile('w2'),
					'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
					'projects/alpha/credentials/c-old/credential.json': credentialFile('c-old'),
				},
				makeManifest({
					workflows: [wf('w1')],
					projects: [alpha],
					credentials: [cred('c1')],
					requirements: { credentials: [credReq('c1', ['w1'])] },
				}),
				{
					'projects/alpha/workflows/w1/workflow.json': workflowUsing('w1', ['c1']),
					'projects/alpha/credentials/c1/credential.json': credentialFile('c1'),
				},
			);

			await expectAbsent('projects/alpha/credentials/c-old');
			expect(await readExported('projects/alpha/credentials/c1/credential.json')).toBe(
				credentialFile('c1'),
			);
			expect(merged.credentials).toEqual([cred('c1')]);
			// The manifest states the tree the push produced, requirements included.
			expect(merged.requirements?.credentials).toEqual([credReq('c1', ['w1'])]);
			expect(merged.requirements?.nodeTypes).toEqual([
				{ type: NODE_TYPE, typeVersion: 1, usedByWorkflows: ['w1'] },
			]);
		});
	});

	describe('deltaCounts', () => {
		it('reports entities added to or removed from the branch, not the export size', () => {
			const before: BranchState = {
				workflows: [wf('w1'), wf('w2')],
				credentials: [cred('c1'), cred('c-old')],
				tags: [{ id: 't1', name: 'Tag1', target: 'tags/t1' }],
			};
			// c-new added, c-old removed, c1 and t1 unchanged.
			const after = makeManifest({
				workflows: [wf('w1'), wf('w2')],
				credentials: [cred('c1'), cred('c-new')],
				tags: [{ id: 't1', name: 'Tag1', target: 'tags/t1' }],
			});

			expect(
				updater.deltaCounts(
					before,
					after,
					selection({ workflowIds: ['w1'], deletedWorkflowIds: ['w2'] }),
				),
			).toEqual({
				workflows: 2,
				folders: 0,
				credentials: 2,
				dataTables: 0,
				variables: 0,
				tags: 0,
			});
		});
	});

	describe('symbolic links on the branch', () => {
		let outside: string;

		beforeEach(async () => {
			outside = path.join(root, 'outside');
			await mkdir(outside, { recursive: true });
		});

		it('refuses to read a branch that holds a symbolic link', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest()),
				'projects/alpha/project.json': projectFile,
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				'disallowed entry type for "projects/alpha/workflows"',
			);
		});

		it('writes nothing through a symbolic link, whatever state the caller hands over', async () => {
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest()),
				'projects/alpha/project.json': projectFile,
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			const staging = makeManifest({ projects: [alpha], workflows: [wf('w1')] });
			await writeTree(stagingFolder, {
				'manifest.json': manifestFile(staging),
				'projects/alpha/workflows/w1/workflow.json': workflowFile('w1'),
			});

			await expect(
				updater.applySelection(
					exportFolder,
					stagingFolder,
					staging,
					{ projects: [alpha] },
					new Set(),
				),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(outside)).toEqual([]);
		});

		it('refuses an export root that is a symbolic link', async () => {
			await writeTree(outside, { 'manifest.json': manifestFile(makeManifest()) });
			await mkdir(path.dirname(exportFolder), { recursive: true });
			await symlink(outside, exportFolder);

			await expect(updater.readBranchState(exportFolder)).rejects.toThrow(
				'disallowed entry type for "."',
			);
		});

		it('rejects a stale target whose parent is a symbolic link instead of deleting through it', async () => {
			// The scan skips a link, so this state cannot come from the tree. The
			// guard has to hold for any state the caller hands over.
			await writeTree(outside, { 'w1/workflow.json': workflowFile('w1') });
			await writeTree(exportFolder, {
				'manifest.json': manifestFile(makeManifest()),
				'projects/alpha/project.json': projectFile,
			});
			await symlink(outside, path.join(exportFolder, 'projects/alpha/workflows'));
			const staging = makeManifest({ projects: [alpha] });
			await writeTree(stagingFolder, { 'manifest.json': manifestFile(staging) });
			const branch: BranchState = { projects: [alpha], workflows: [wf('w1')] };

			await expect(
				updater.applySelection(exportFolder, stagingFolder, staging, branch, new Set(['w1'])),
			).rejects.toThrow(/"projects\/alpha\/workflows" on the branch is a symbolic link/);
			expect(await readdir(path.join(outside, 'w1'))).toEqual(['workflow.json']);
		});
	});
});
