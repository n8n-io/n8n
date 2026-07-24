import type { Folder, Project, SharedWorkflowRepository, User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { FolderFinderService } from '@/services/folder-finder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '../../package-export.errors';
import { AutoIncludedWorkflowResolver } from '../auto-included-workflow-resolver';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

const user = mock<User>({ id: 'user-1' });

function makeWorkflow(id: string, parentFolderId?: string): WorkflowEntity {
	return {
		id,
		name: id,
		parentFolder: parentFolderId ? ({ id: parentFolderId } as Folder) : null,
	} as WorkflowEntity;
}

function makeFolder(id: string): Folder {
	return { id, name: id, parentFolderId: null } as Folder;
}

function makeProject(id: string): Project {
	return { id, name: id } as Project;
}

/**
 * Wires the resolver against in-memory stores. `workflows` is the pool the
 * finder can see; `owners`/`folderChains`/`projects` back the metadata lookups.
 * Anything omitted is treated as accessible-but-empty so tests only set up the
 * facet they exercise.
 */
function makeResolver(options: {
	workflows?: WorkflowEntity[];
	owners?: Record<string, Project>;
	folderChains?: Record<string, Folder[]>;
	projects?: Project[];
}) {
	const workflowsById = new Map((options.workflows ?? []).map((w) => [w.id, w]));

	const workflowFinder = mock<WorkflowFinderService>();
	workflowFinder.findWorkflowsByIdsForUser.mockImplementation(async (ids) =>
		ids.map((id) => workflowsById.get(id)).filter((w): w is WorkflowEntity => w !== undefined),
	);
	workflowFinder.findExistingWorkflowIds.mockResolvedValue(new Set());

	const folderFinder = mock<FolderFinderService>();
	folderFinder.findFolderAncestorChainsForUser.mockImplementation(async (ids) => {
		const chains = new Map<string, Folder[]>();
		for (const id of ids) {
			const chain = options.folderChains?.[id];
			if (chain) chains.set(id, chain);
		}
		return chains;
	});
	folderFinder.findExistingFolderIds.mockResolvedValue(new Set());

	const projectService = mock<ProjectService>();
	projectService.findProjectsByIdsForUser.mockImplementation(async (_user, ids) =>
		(options.projects ?? []).filter((p) => ids.includes(p.id)),
	);
	projectService.findExistingProjectIds.mockResolvedValue(new Set());

	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	// The resolver looks up owner projects keyed by workflowId, so returning every
	// configured owner (ignoring the requested id filter) is equivalent.
	sharedWorkflowRepository.findOwnerProjectsByWorkflowIds.mockResolvedValue(
		new Map(Object.entries(options.owners ?? {})),
	);

	const resolver = new AutoIncludedWorkflowResolver(
		workflowFinder,
		folderFinder,
		projectService,
		sharedWorkflowRepository,
	);

	return { resolver, workflowFinder, folderFinder, projectService };
}

function requirement(
	workflowId: string,
	referencedWorkflowId: string,
): WorkflowSubWorkflowRequirement {
	return { workflowId, referencedWorkflowId };
}

function resolveInput(options: {
	topLevelWorkflowIds?: string[];
	folderWorkflowIds?: string[];
	projectWorkflowIds?: string[];
	requirements: WorkflowSubWorkflowRequirement[];
}) {
	return {
		user,
		topLevelWorkflowIds: options.topLevelWorkflowIds ?? [],
		folderWorkflowIds: options.folderWorkflowIds ?? [],
		projectWorkflowIds: options.projectWorkflowIds ?? [],
		requirements: options.requirements,
	};
}

describe('AutoIncludedWorkflowResolver', () => {
	it('returns nothing to add when every requirement points back at a seed', async () => {
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('a'), makeWorkflow('b')],
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				topLevelWorkflowIds: ['a', 'b'],
				requirements: [requirement('a', 'b')],
			}),
		);

		expect(autoIncludedWorkflows).toEqual([]);
	});

	it('auto-includes transitively reachable sub-workflows carrying the seed placement', async () => {
		// seed a → b → c, only a is exported
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('a'), makeWorkflow('b'), makeWorkflow('c')],
			owners: { b: makeProject('p1'), c: makeProject('p1') },
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				topLevelWorkflowIds: ['a'],
				requirements: [requirement('a', 'b'), requirement('b', 'c')],
			}),
		);

		expect(autoIncludedWorkflows.map((d) => d.workflow.id)).toEqual(['b', 'c']);
		expect(autoIncludedWorkflows.every((d) => d.placement === 'top-level')).toBe(true);
		expect(autoIncludedWorkflows.every((d) => d.folderChain.length === 0)).toBe(true);
	});

	it('prefers folder over top-level when a workflow is reached from both a folder and a top-level seed', async () => {
		// projectId is mutually exclusive with folder/workflow ids, so top-level
		// + folder is the only origin mix a real request can produce.
		const chain = [makeFolder('root')];
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('folderSeed'), makeWorkflow('topSeed'), makeWorkflow('b', 'root')],
			owners: { b: makeProject('p1') },
			folderChains: { root: chain },
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				topLevelWorkflowIds: ['topSeed'],
				folderWorkflowIds: ['folderSeed'],
				requirements: [requirement('topSeed', 'b'), requirement('folderSeed', 'b')],
			}),
		);

		expect(autoIncludedWorkflows).toHaveLength(1);
		expect(autoIncludedWorkflows[0].placement).toBe('folder');
	});

	it('prefers the richest placement (project > folder > top-level) when origins converge', async () => {
		// project+folder isn't a reachable request shape today; this guards the
		// generic precedence invariant if that validation ever loosens.
		const project = makeProject('p1');
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('folderSeed'), makeWorkflow('projectSeed'), makeWorkflow('b')],
			owners: { b: project },
			projects: [project],
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				folderWorkflowIds: ['folderSeed'],
				projectWorkflowIds: ['projectSeed'],
				requirements: [requirement('folderSeed', 'b'), requirement('projectSeed', 'b')],
			}),
		);

		expect(autoIncludedWorkflows).toHaveLength(1);
		expect(autoIncludedWorkflows[0].placement).toBe('project');
		expect(autoIncludedWorkflows[0].ownerProject).toBe(project);
	});

	it('resolves the folder chain for a folder-placed dependency with a parent folder', async () => {
		const chain = [makeFolder('root'), makeFolder('child')];
		const { resolver, folderFinder } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b', 'child')],
			owners: { b: makeProject('p1') },
			folderChains: { child: chain },
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				folderWorkflowIds: ['seed'],
				requirements: [requirement('seed', 'b')],
			}),
		);

		expect(autoIncludedWorkflows[0].placement).toBe('folder');
		expect(autoIncludedWorkflows[0].folderChain).toEqual(chain);
		expect(folderFinder.findFolderAncestorChainsForUser).toHaveBeenCalledWith(['child'], user, [
			'folder:read',
		]);
	});

	it('downgrades a folder placement to top-level when the workflow has no parent folder', async () => {
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b')],
			owners: { b: makeProject('p1') },
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				folderWorkflowIds: ['seed'],
				requirements: [requirement('seed', 'b')],
			}),
		);

		expect(autoIncludedWorkflows[0].placement).toBe('top-level');
		expect(autoIncludedWorkflows[0].folderChain).toEqual([]);
	});

	it('auto-includes each workflow once when sub-workflow references are circular', async () => {
		// seed → b → c → b (cycle); b and c added exactly once.
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b'), makeWorkflow('c')],
			owners: { b: makeProject('p1'), c: makeProject('p1') },
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				topLevelWorkflowIds: ['seed'],
				requirements: [requirement('seed', 'b'), requirement('b', 'c'), requirement('c', 'b')],
			}),
		);

		expect(autoIncludedWorkflows.map((d) => d.workflow.id).sort()).toEqual(['b', 'c']);
	});

	it('merges the same workflow listed in multiple origin buckets before resolving placement', async () => {
		// The same seed listed as both folder and project should propagate the
		// richer project origin onto its dependency.
		const project = makeProject('p1');
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b')],
			owners: { b: project },
			projects: [project],
		});

		const { autoIncludedWorkflows } = await resolver.resolve(
			resolveInput({
				folderWorkflowIds: ['seed'],
				projectWorkflowIds: ['seed'],
				requirements: [requirement('seed', 'b')],
			}),
		);

		expect(autoIncludedWorkflows[0].placement).toBe('project');
	});

	it('throws PackageExportBlockedError when a dependency has no owner project', async () => {
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b')],
			owners: {}, // b has no owner row
		});

		await expect(
			resolver.resolve(
				resolveInput({
					topLevelWorkflowIds: ['seed'],
					requirements: [requirement('seed', 'b')],
				}),
			),
		).rejects.toThrow(PackageExportBlockedError);
	});

	it('throws PackageEntityNotFoundError when an auto-included sub-workflow does not exist at all', async () => {
		// `seed` references `b`, but `b` is absent from the finder pool and the
		// existence re-check finds nothing either, so it is genuinely deleted.
		const { resolver } = makeResolver({
			workflows: [makeWorkflow('seed')],
		});

		await expect(
			resolver.resolve(
				resolveInput({
					topLevelWorkflowIds: ['seed'],
					requirements: [requirement('seed', 'b')],
				}),
			),
		).rejects.toBeInstanceOf(PackageEntityNotFoundError);
	});

	it('throws PackageEntityAccessDeniedError when an auto-included sub-workflow exists but is inaccessible', async () => {
		// `b` is missing from the caller-scoped finder pool, but the existence
		// re-check (which bypasses access control) still returns it — so the
		// caller simply lacks access rather than the workflow being deleted.
		const { resolver, workflowFinder } = makeResolver({
			workflows: [makeWorkflow('seed')],
		});
		workflowFinder.findExistingWorkflowIds.mockResolvedValue(new Set(['b']));

		await expect(
			resolver.resolve(
				resolveInput({
					topLevelWorkflowIds: ['seed'],
					requirements: [requirement('seed', 'b')],
				}),
			),
		).rejects.toBeInstanceOf(PackageEntityAccessDeniedError);
	});

	it('requests exportable workflows with the workflow:export scope and parent folder', async () => {
		const { resolver, workflowFinder } = makeResolver({
			workflows: [makeWorkflow('seed'), makeWorkflow('b')],
			owners: { b: makeProject('p1') },
		});

		await resolver.resolve(
			resolveInput({
				topLevelWorkflowIds: ['seed'],
				requirements: [requirement('seed', 'b')],
			}),
		);

		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			['b'],
			user,
			['workflow:export'],
			{ includeParentFolder: true },
		);
	});
});
