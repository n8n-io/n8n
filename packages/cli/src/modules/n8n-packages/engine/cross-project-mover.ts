import type { WorkflowTransferResult } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { WorkflowImportMatchService } from '../entities/workflow/workflow-import-match.service';
import { CrossProjectMovePolicy, WorkflowIdPolicy } from '../n8n-packages.types';
import type {
	BlockingIssue,
	CrossProjectMoveSummary,
	ImportContext,
	PlannedCrossProjectMove,
	ResolvedImportRequest,
} from '../n8n-packages.types';

/** What the planner reads of one project scope of the import. */
export interface CrossProjectMoveScope {
	context: Pick<ImportContext, 'user' | 'projectId'>;
	folders: Array<{ sourceFolderId: string; resourceType?: string }>;
	workflows: Array<{ sourceWorkflowId: string }>;
	options: Pick<
		ResolvedImportRequest,
		'idPolicy' | 'crossProjectMovePolicy' | 'confirmedMovesOutOfOperation'
	>;
	projectPendingCreation?: boolean;
}

/** What one project scope must know about the planned transfers to plan its own content. */
export interface ScopeCrossProjectMoves {
	/** Package workflows that another project holds: source id to the workflow on the target. */
	movedInWorkflows: ReadonlyMap<string, WorkflowEntity>;
	/** Package folders that another project holds. After the transfer they are in this project. */
	movedInFolderIds: ReadonlySet<string>;
	/** Workflows that a transfer puts at the root of this project. */
	rootedWorkflowIds: ReadonlySet<string>;
	/** Folders that a transfer puts at the root of this project. */
	rootedFolderIds: ReadonlySet<string>;
	/** Workflows that leave this project. They are not "missing from the package". */
	movedOutWorkflowIds: ReadonlySet<string>;
	/** Folders that leave this project. */
	movedOutFolderIds: ReadonlySet<string>;
}

/** One call of the editor transfer. A folder step moves the whole tree of the folder. */
interface TransferStep {
	kind: 'workflow' | 'folder';
	id: string;
	toProjectId: string;
}

export interface CrossProjectMovePlan {
	/** Each workflow and folder of the package that changes project, for the caller and the result. */
	moves: PlannedCrossProjectMove[];
	/** The transfers to run, in order. A folder tree carries the items inside it. */
	steps: TransferStep[];
	issues: BlockingIssue[];
	/** By project id of the scope. */
	scopes: ReadonlyMap<string, ScopeCrossProjectMoves>;
}

interface FolderState {
	name: string;
	homeProjectId: string;
	projectId: string;
	parentFolderId: string | null;
}

interface WorkflowState {
	name: string;
	homeProjectId: string;
	projectId: string;
	parentFolderId: string | null;
}

const NO_MOVES: CrossProjectMovePlan = { moves: [], steps: [], issues: [], scopes: new Map() };

/**
 * Plans and runs the moves of workflows and folders between team projects
 * (`crossProjectMovePolicy=transfer`). The package holds an item under one project and the target
 * holds it under another: the import transfers it, so the id, the history and the executions stay.
 *
 * The transfers run before the content of any project. Each project scope then plans a moved item
 * as an item that it already holds.
 */
@Service()
export class CrossProjectMover {
	constructor(
		private readonly workflowImportMatchService: WorkflowImportMatchService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly folderService: FolderService,
		private readonly projectService: ProjectService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
	) {}

	/** Reads the target and writes nothing. A move from or to a personal project is not planned. */
	async plan(scopes: CrossProjectMoveScope[]): Promise<CrossProjectMovePlan> {
		const options = scopes[0]?.options;
		if (options?.crossProjectMovePolicy !== CrossProjectMovePolicy.Transfer) return NO_MOVES;
		const { user } = scopes[0].context;
		const operationProjectIds = new Set(scopes.map(({ context }) => context.projectId));

		// Without the source id policy the target ids differ, so no workflow can match by id.
		const packageWorkflows =
			options.idPolicy === WorkflowIdPolicy.Source
				? scopes.flatMap(({ context, workflows }) =>
						workflows.map(({ sourceWorkflowId }) => ({
							id: sourceWorkflowId,
							scopeProjectId: context.projectId,
						})),
					)
				: [];
		const packageFolders = scopes.flatMap(({ context, folders }) =>
			folders
				.filter(({ resourceType }) => (resourceType ?? 'workflow') === 'workflow')
				.map(({ sourceFolderId }) => ({ id: sourceFolderId, scopeProjectId: context.projectId })),
		);

		const owners = await this.workflowImportMatchService.findOwningProjectsByWorkflowId(
			packageWorkflows.map(({ id }) => id),
		);
		const homes = new Map(
			(await this.folderService.getFoldersByIds(packageFolders.map(({ id }) => id)))
				.filter((folder) => (folder.resourceType ?? 'workflow') === 'workflow')
				.map((folder) => [folder.id, folder.homeProject.id]),
		);

		const otherProjectIds = new Set<string>();
		for (const { id, scopeProjectId } of packageWorkflows) {
			const projectId = owners.get(id)?.projectId;
			if (projectId && projectId !== scopeProjectId) otherProjectIds.add(projectId);
		}
		for (const { id, scopeProjectId } of packageFolders) {
			const projectId = homes.get(id);
			if (projectId && projectId !== scopeProjectId) otherProjectIds.add(projectId);
		}
		if (otherProjectIds.size === 0) return NO_MOVES;

		// A personal project never takes part in a move. Its items keep the id conflict.
		const sourceProjectIds = await this.teamProjectsOf(otherProjectIds);
		if (sourceProjectIds.size === 0) return NO_MOVES;

		const lineageMatched = await this.matchedInOwnScope(packageWorkflows, owners, sourceProjectIds);
		const isMovable = ({ id, scopeProjectId }: { id: string; scopeProjectId: string }) =>
			!lineageMatched.has(`${scopeProjectId}/${id}`);

		const { folders, workflows } = await this.readSourceProjects(sourceProjectIds);

		const steps: TransferStep[] = [];
		const rooted = { workflows: new Map<string, string>(), folders: new Map<string, string>() };
		/** Workflows that each folder step carries, for the permission check. */
		const carriedWorkflowIds = new Map<string, string[]>();

		// Parents first: the tree of a parent carries its sub-folders, so they need no own transfer.
		const depthOf = depthReader(folders);
		const orderedFolders = packageFolders
			.filter(({ id }) => folders.has(id))
			.sort((a, b) => depthOf(a.id) - depthOf(b.id));
		for (const { id, scopeProjectId } of orderedFolders) {
			const folder = folders.get(id)!;
			if (folder.projectId === scopeProjectId) continue;

			const tree = subtreeOf(id, folders);
			const carried: string[] = [];
			for (const folderId of tree) folders.get(folderId)!.projectId = scopeProjectId;
			for (const [workflowId, workflow] of workflows) {
				if (workflow.parentFolderId === null || !tree.has(workflow.parentFolderId)) continue;
				workflow.projectId = scopeProjectId;
				carried.push(workflowId);
			}
			// The parent of the new project can be missing at this point, so the tree goes to the root.
			folder.parentFolderId = null;
			rooted.folders.set(id, scopeProjectId);
			carriedWorkflowIds.set(id, carried);
			steps.push({ kind: 'folder', id, toProjectId: scopeProjectId });
		}

		for (const item of packageWorkflows) {
			const workflow = workflows.get(item.id);
			if (!workflow || workflow.projectId === item.scopeProjectId || !isMovable(item)) continue;
			workflow.projectId = item.scopeProjectId;
			workflow.parentFolderId = null;
			rooted.workflows.set(item.id, item.scopeProjectId);
			steps.push({ kind: 'workflow', id: item.id, toProjectId: item.scopeProjectId });
		}

		const movedWorkflows = packageWorkflows.filter((item) => {
			const workflow = workflows.get(item.id);
			return workflow && workflow.homeProjectId !== item.scopeProjectId && isMovable(item);
		});
		const movedFolders = packageFolders.filter((item) => {
			const folder = folders.get(item.id);
			return folder && folder.homeProjectId !== item.scopeProjectId;
		});

		const shared = await this.workflowFinderService.findSharedWorkflowIds(
			movedWorkflows.map(({ id }) => id),
		);
		const entities = await this.loadWorkflows(movedWorkflows, workflows);
		const confirmed = options.confirmedMovesOutOfOperation === true;
		const toMove = (
			kind: PlannedCrossProjectMove['kind'],
			id: string,
			state: FolderState | WorkflowState,
			toProjectId: string,
		): PlannedCrossProjectMove => {
			const fromProjectInOperation = operationProjectIds.has(state.homeProjectId);
			return {
				kind,
				id,
				name: state.name,
				fromProjectId: state.homeProjectId,
				toProjectId,
				fromProjectInOperation,
				needsConfirmation: !fromProjectInOperation && !confirmed,
			};
		};
		const moves: PlannedCrossProjectMove[] = [
			...movedFolders.map(({ id, scopeProjectId }) =>
				toMove('folder', id, folders.get(id)!, scopeProjectId),
			),
			...movedWorkflows.map(({ id, scopeProjectId }) => ({
				...toMove('workflow', id, workflows.get(id)!, scopeProjectId),
				losesShares: shared.has(id),
				published: (entities.get(id)?.activeVersionId ?? null) !== null,
			})),
		];

		const issues = [
			...moves
				.filter(({ needsConfirmation }) => needsConfirmation)
				.map((move) => toIssue(move, 'unconfirmed')),
			...(await this.permissionIssues(user, scopes, moves, steps, carriedWorkflowIds)),
		];

		const scopeMoves = new Map<string, ScopeCrossProjectMoves>();
		for (const { context } of scopes) {
			const { projectId } = context;
			const leftProject = (state: FolderState | WorkflowState) =>
				state.homeProjectId === projectId && state.projectId !== projectId;
			scopeMoves.set(projectId, {
				movedInWorkflows: new Map(
					movedWorkflows
						.filter(({ scopeProjectId }) => scopeProjectId === projectId)
						.flatMap(({ id }) => {
							const entity = entities.get(id);
							return entity ? [[id, entity] as const] : [];
						}),
				),
				movedInFolderIds: new Set(
					movedFolders
						.filter(({ scopeProjectId }) => scopeProjectId === projectId)
						.map(({ id }) => id),
				),
				rootedWorkflowIds: idsWithValue(rooted.workflows, projectId),
				rootedFolderIds: idsWithValue(rooted.folders, projectId),
				movedOutWorkflowIds: new Set(
					[...workflows].filter(([, state]) => leftProject(state)).map(([id]) => id),
				),
				movedOutFolderIds: new Set(
					[...folders].filter(([, state]) => leftProject(state)).map(([id]) => id),
				),
			});
		}

		return { moves, steps, issues, scopes: scopeMoves };
	}

	/**
	 * Runs the transfers through the editor transfer: the workflow keeps its id, its history and
	 * its executions, and it loses its shares. A published workflow stays published when the new
	 * project accepts its published version. If not, the transfer unpublishes it and the summary
	 * says so.
	 */
	async apply(user: User, plan: CrossProjectMovePlan): Promise<CrossProjectMoveSummary[]> {
		const unpublished = new Map<string, string>();

		for (const step of plan.steps) {
			if (step.kind === 'folder') {
				const [folder] = await this.folderService.getFoldersByIds([step.id]);
				// An earlier folder step can carry this folder already.
				if (!folder || folder.homeProject.id === step.toProjectId) continue;
				const { unpublishedWorkflows } = await this.enterpriseWorkflowService.transferFolder(
					user,
					folder.homeProject.id,
					step.id,
					step.toProjectId,
					PROJECT_ROOT,
				);
				for (const workflow of unpublishedWorkflows) {
					unpublished.set(workflow.id, unpublishReason(workflow));
				}
				continue;
			}

			const owner = (
				await this.workflowImportMatchService.findOwningProjectsByWorkflowId([step.id])
			).get(step.id);
			if (!owner || owner.projectId === step.toProjectId) continue;
			const result = await this.enterpriseWorkflowService.transferWorkflow(
				user,
				step.id,
				step.toProjectId,
			);
			if (result) unpublished.set(step.id, unpublishReason(result));
		}

		return plan.moves.map(({ kind, id, name, fromProjectId, toProjectId }) => {
			const reason = kind === 'workflow' ? unpublished.get(id) : undefined;
			return {
				kind,
				id,
				name,
				fromProjectId,
				toProjectId,
				...(reason !== undefined ? { unpublished: { reason } } : {}),
			};
		});
	}

	private async teamProjectsOf(projectIds: Set<string>): Promise<Set<string>> {
		const teamProjectIds = new Set<string>();
		for (const projectId of projectIds) {
			const project = await this.projectService.findProject(projectId);
			if (project?.type === 'team') teamProjectIds.add(projectId);
		}
		return teamProjectIds;
	}

	/**
	 * A scope can hold a copy that came from the same source workflow under another id. The import
	 * updates that copy, so the workflow of the other project does not move.
	 */
	private async matchedInOwnScope(
		packageWorkflows: Array<{ id: string; scopeProjectId: string }>,
		owners: Map<string, { projectId: string | null }>,
		sourceProjectIds: Set<string>,
	): Promise<Set<string>> {
		const candidates = new Map<string, string[]>();
		for (const { id, scopeProjectId } of packageWorkflows) {
			const projectId = owners.get(id)?.projectId;
			if (!projectId || projectId === scopeProjectId || !sourceProjectIds.has(projectId)) continue;
			candidates.set(scopeProjectId, [...(candidates.get(scopeProjectId) ?? []), id]);
		}

		const matched = new Set<string>();
		for (const [scopeProjectId, ids] of candidates) {
			const { matches } = await this.workflowImportMatchService.findBySourceWorkflowIds(
				scopeProjectId,
				ids,
			);
			for (const id of matches.keys()) matched.add(`${scopeProjectId}/${id}`);
		}
		return matched;
	}

	/** Every folder and workflow of the projects that lose an item, where they are now. */
	private async readSourceProjects(projectIds: Set<string>) {
		const folders = new Map<string, FolderState>();
		const workflows = new Map<string, WorkflowState>();
		for (const projectId of projectIds) {
			for (const folder of await this.folderService.getFolderPlacementsInProject(projectId)) {
				folders.set(folder.id, {
					name: folder.name,
					homeProjectId: projectId,
					projectId,
					parentFolderId: folder.parentFolderId,
				});
			}
			const placements = await this.workflowFinderService.findOwnedWorkflowPlacementsInProject(
				projectId,
				{ includeArchived: true },
			);
			for (const workflow of placements) {
				workflows.set(workflow.id, {
					name: workflow.name,
					homeProjectId: projectId,
					projectId,
					parentFolderId: workflow.parentFolderId,
				});
			}
		}
		return { folders, workflows };
	}

	/** The moved workflows as the workflow importer reads a workflow of its own project. */
	private async loadWorkflows(
		moved: Array<{ id: string }>,
		workflows: Map<string, WorkflowState>,
	): Promise<Map<string, WorkflowEntity>> {
		const idsByProject = new Map<string, string[]>();
		for (const { id } of moved) {
			const { homeProjectId } = workflows.get(id)!;
			idsByProject.set(homeProjectId, [...(idsByProject.get(homeProjectId) ?? []), id]);
		}

		const entities = new Map<string, WorkflowEntity>();
		for (const [projectId, ids] of idsByProject) {
			const found = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
				projectId,
				ids,
				{ includeActiveVersion: true, includeParentFolder: true, includeArchived: true },
			);
			// The lookup also matches by source id. Only the workflow with the package id moves.
			for (const entity of found) if (ids.includes(entity.id)) entities.set(entity.id, entity);
		}
		return entities;
	}

	/**
	 * The rights of the editor transfer: `workflow:move` on each workflow that moves, and the
	 * right to create in the new project. The transfer checks them again when it runs.
	 */
	private async permissionIssues(
		user: User,
		scopes: CrossProjectMoveScope[],
		moves: PlannedCrossProjectMove[],
		steps: TransferStep[],
		carriedWorkflowIds: Map<string, string[]>,
	): Promise<BlockingIssue[]> {
		const issues: BlockingIssue[] = [];
		const moveOf = (kind: TransferStep['kind'], id: string) =>
			moves.find((move) => move.kind === kind && move.id === id);

		const workflowIds = [
			...steps.filter(({ kind }) => kind === 'workflow').map(({ id }) => id),
			...[...carriedWorkflowIds.values()].flat(),
		];
		const movable = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			workflowIds,
			user,
			['workflow:move'],
		);
		const reported = new Set<PlannedCrossProjectMove>();
		const report = (move: PlannedCrossProjectMove | undefined, missingScope: Scope) => {
			if (!move || reported.has(move)) return;
			reported.add(move);
			issues.push(toIssue(move, 'forbidden', missingScope));
		};
		for (const { kind, id } of steps) {
			if (kind === 'workflow') {
				if (!movable.has(id)) report(moveOf('workflow', id), 'workflow:move');
				continue;
			}
			for (const workflowId of carriedWorkflowIds.get(id) ?? []) {
				if (movable.has(workflowId)) continue;
				report(moveOf('workflow', workflowId) ?? moveOf('folder', id), 'workflow:move');
			}
		}

		// The user creates a pending project, so the user is its admin.
		const pending = new Set(
			scopes
				.filter(({ projectPendingCreation }) => projectPendingCreation)
				.map(({ context }) => context.projectId),
		);
		const required = new Map<string, Set<Scope>>();
		for (const { kind, toProjectId } of steps) {
			if (pending.has(toProjectId)) continue;
			const scopesOfProject = required.get(toProjectId) ?? new Set<Scope>();
			scopesOfProject.add('workflow:create');
			if (kind === 'folder') scopesOfProject.add('folder:create');
			required.set(toProjectId, scopesOfProject);
		}
		for (const [projectId, scopesOfProject] of required) {
			for (const scope of scopesOfProject) {
				if (await this.projectService.getProjectWithScope(user, projectId, [scope])) continue;
				for (const move of moves) {
					if (move.toProjectId !== projectId) continue;
					if (scope === 'folder:create' && move.kind !== 'folder') continue;
					report(move, scope);
				}
			}
		}

		return issues;
	}
}

function toIssue(
	{ kind, id, name, fromProjectId, toProjectId }: PlannedCrossProjectMove,
	reason: 'forbidden' | 'unconfirmed',
	missingScope?: Scope,
): BlockingIssue {
	return {
		type: 'cross-project-move-blocked',
		kind: reason,
		entity: kind,
		id,
		name,
		fromProjectId,
		toProjectId,
		...(missingScope ? { missingScope } : {}),
	};
}

function unpublishReason(result: WorkflowTransferResult): string {
	return 'unpublishReasons' in result
		? result.unpublishReasons.map(({ message }) => message).join('; ')
		: result.error.message;
}

function idsWithValue(map: Map<string, string>, value: string): Set<string> {
	return new Set([...map].filter(([, current]) => current === value).map(([id]) => id));
}

/** The folder and every folder below it, by the parent links as they are now. */
function subtreeOf(rootId: string, folders: Map<string, FolderState>): Set<string> {
	const children = new Map<string, string[]>();
	for (const [id, { parentFolderId }] of folders) {
		if (parentFolderId === null) continue;
		children.set(parentFolderId, [...(children.get(parentFolderId) ?? []), id]);
	}
	const tree = new Set<string>();
	const pending = [rootId];
	while (pending.length > 0) {
		const id = pending.pop()!;
		if (tree.has(id)) continue;
		tree.add(id);
		pending.push(...(children.get(id) ?? []));
	}
	return tree;
}

/** Depth from the project root, read before any planned transfer changes a parent. */
function depthReader(folders: Map<string, FolderState>): (id: string) => number {
	const parents = new Map([...folders].map(([id, { parentFolderId }]) => [id, parentFolderId]));
	const depths = new Map<string, number>();
	const depthOf = (id: string): number => {
		const cached = depths.get(id);
		if (cached !== undefined) return cached;
		// Set first, so a parent cycle cannot recurse without end.
		depths.set(id, 0);
		const parentId = parents.get(id) ?? null;
		const depth = parentId === null ? 0 : depthOf(parentId) + 1;
		depths.set(id, depth);
		return depth;
	};
	return depthOf;
}
