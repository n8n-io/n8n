import type { PromotableResource } from '@n8n/api-types';

import type { PackageFile } from '../base-branch-files';
import type { PackageFileChange } from '../diff-package-files';
import {
	applyStructuralRenames,
	collectStructuralDiff,
	retainStructuralMatches,
	type ContainerRename,
	type WorkflowPlacement,
} from '../structural-promotion-rows';

const projectDir = 'n8n-export/projects/alpha-proj';
const oldFolder = `${projectDir}/folders/original-folder`;
const newFolder = `${projectDir}/folders/renamed-folder`;

function workflow(
	id: string,
	name: string,
	status: PromotableResource['status'] = 'modified',
): PromotableResource {
	return {
		id,
		name,
		type: 'workflow',
		status,
		version: 1,
		updatedAt: null,
		updatedBy: null,
		dependencyCount: 0,
		changedDependencies: [],
		parentId: null,
	};
}

function placement(desired: string | null, base: string | null = desired): WorkflowPlacement {
	return { base, desired };
}

function packageFile(type: PackageFile['type'], entityId: string, path: string): PackageFile {
	const fileName = {
		project: 'project.json',
		folder: 'folder.json',
		workflow: 'workflow.json',
		credential: 'credential.json',
		dataTable: 'data-table.json',
		variable: 'variable.json',
		tag: 'tag.json',
	} as const satisfies Record<PackageFile['type'], PackageFile['fileName']>;
	return {
		entityId,
		slug: 'slug',
		projectId: 'proj',
		fileName: fileName[type],
		path,
		blobSha: 'abc',
		type,
	};
}

describe('collectStructuralDiff', () => {
	it('records a renamed folder and the workflow directories on both sides', () => {
		const oldDir = 'n8n-export/projects/alpha-proj/folders/original-folder';
		const newDir = 'n8n-export/projects/alpha-proj/folders/renamed-folder';
		const changes: PackageFileChange[] = [
			{
				change: 'renamed-and-modified',
				base: packageFile('folder', 'folder', `${oldDir}/folder.json`),
				desired: packageFile('folder', 'folder', `${newDir}/folder.json`),
			},
			{
				change: 'renamed',
				base: packageFile('workflow', 'wf-in', `${oldDir}/workflows/inside-wf-in/workflow.json`),
				desired: packageFile('workflow', 'wf-in', `${newDir}/workflows/inside-wf-in/workflow.json`),
			},
			{
				change: 'modified',
				base: packageFile('project', 'proj', 'n8n-export/projects/alpha-proj/project.json'),
				desired: packageFile('project', 'proj', 'n8n-export/projects/alpha-proj/project.json'),
			},
		];

		const { containerRenames, workflowPlacements } = collectStructuralDiff(
			changes,
			new Map([['folder', 'Revenue']]),
		);

		expect(containerRenames).toEqual([
			{
				id: 'folder',
				type: 'folder',
				name: 'Revenue',
				status: 'renamed-and-modified',
				baseDir: oldDir,
				desiredDir: newDir,
			},
		]);
		expect(workflowPlacements.get('wf-in')).toEqual({
			base: `${oldDir}/workflows/inside-wf-in`,
			desired: `${newDir}/workflows/inside-wf-in`,
		});
	});
});

describe('applyStructuralRenames', () => {
	it('adds no container row when no container moved', () => {
		const rows = applyStructuralRenames(
			[workflow('wf-in', 'Inside')],
			[],
			new Map([['wf-in', placement(`${newFolder}/workflows/inside-wf-in`)]]),
		);

		expect(rows).toEqual([expect.objectContaining({ id: 'wf-in', parentId: null })]);
	});

	it('puts workflows inside a renamed folder under it and leaves the others alone', () => {
		const folder: ContainerRename = {
			id: 'folder',
			type: 'folder',
			name: 'Revenue',
			status: 'renamed-and-modified',
			baseDir: oldFolder,
			desiredDir: newFolder,
		};
		const rows = applyStructuralRenames(
			[
				workflow('wf-in', 'Inside', 'renamed'),
				workflow('wf-out', 'Outside'),
				workflow('wf-del', 'Removed', 'deleted'),
			],
			[folder],
			new Map([
				[
					'wf-in',
					placement(`${newFolder}/workflows/inside-wf-in`, `${oldFolder}/workflows/inside-wf-in`),
				],
				['wf-out', placement(`${projectDir}/workflows/outside-wf-out`)],
				['wf-del', placement(null, `${oldFolder}/workflows/removed-wf-del`)],
			]),
		);

		expect(rows).toEqual([
			expect.objectContaining({
				id: 'wf-in',
				parentId: 'folder',
			}),
			expect.objectContaining({ id: 'wf-out', parentId: null }),
			expect.objectContaining({
				id: 'wf-del',
				parentId: 'folder',
			}),
			expect.objectContaining({
				id: 'folder',
				name: 'Revenue',
				type: 'folder',
				status: 'renamed-and-modified',
				parentId: null,
			}),
		]);
	});

	it('omits a renamed folder after its workflow has moved out', () => {
		const folder: ContainerRename = {
			id: 'folder',
			type: 'folder',
			name: 'Revenue',
			status: 'renamed',
			baseDir: oldFolder,
			desiredDir: newFolder,
		};
		const rows = applyStructuralRenames(
			[workflow('wf-out', 'Left', 'renamed')],
			[folder],
			new Map([
				[
					'wf-out',
					placement(`${projectDir}/workflows/left-wf-out`, `${oldFolder}/workflows/left-wf-out`),
				],
			]),
		);

		expect(rows).toEqual([expect.objectContaining({ id: 'wf-out', parentId: null })]);
	});

	it('nests a renamed folder and its workflows under the renamed project', () => {
		const project: ContainerRename = {
			id: 'proj',
			type: 'project',
			name: 'Renamed project',
			status: 'renamed-and-modified',
			baseDir: 'n8n-export/projects/alpha-proj',
			desiredDir: 'n8n-export/projects/renamed-proj',
		};
		const folder: ContainerRename = {
			id: 'folder',
			type: 'folder',
			name: 'Revenue',
			status: 'renamed',
			baseDir: 'n8n-export/projects/alpha-proj/folders/original-folder',
			desiredDir: 'n8n-export/projects/renamed-proj/folders/renamed-folder',
		};
		const workflowDir =
			'n8n-export/projects/renamed-proj/folders/renamed-folder/workflows/inside-wf-in';
		const rows = applyStructuralRenames(
			[workflow('wf-in', 'Inside', 'renamed')],
			[project, folder],
			new Map([['wf-in', placement(workflowDir)]]),
		);

		expect(rows).toContainEqual(
			expect.objectContaining({
				id: 'proj',
				type: 'project',
				parentId: null,
			}),
		);
		expect(rows).toContainEqual(
			expect.objectContaining({
				id: 'folder',
				type: 'folder',
				parentId: 'proj',
			}),
		);
		expect(rows).toContainEqual(
			expect.objectContaining({
				id: 'wf-in',
				parentId: 'folder',
			}),
		);
	});
});

describe('retainStructuralMatches', () => {
	const changes: PromotableResource[] = [
		workflow('wf-in', 'Inside'),
		workflow('wf-sib', 'Sibling'),
		workflow('wf-out', 'Outside'),
		{
			id: 'folder',
			name: 'Revenue',
			type: 'folder',
			status: 'renamed',
			version: null,
			updatedAt: null,
			updatedBy: null,
			dependencyCount: 0,
			changedDependencies: [],
			parentId: null,
		},
	];
	changes[0].parentId = 'folder';
	changes[1].parentId = 'folder';

	it('returns the matching workflow with its renamed folder, without the siblings', () => {
		expect(retainStructuralMatches(changes, 'inside').map((change) => change.id)).toEqual([
			'wf-in',
			'folder',
		]);
	});

	it('returns everything inside the folder when the folder name matches', () => {
		expect(retainStructuralMatches(changes, 'revenue').map((change) => change.id)).toEqual([
			'wf-in',
			'wf-sib',
			'folder',
		]);
	});

	it('returns a workflow outside any renamed folder on its own', () => {
		expect(retainStructuralMatches(changes, 'outside').map((change) => change.id)).toEqual([
			'wf-out',
		]);
	});
});
