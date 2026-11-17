import type {
	PromotionAppliedMove,
	PromotionApplyCheck,
	PromotionDirection,
	PromotionPlannedMove,
	PromotionResource,
} from '@n8n/api-types';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import type {
	CrossProjectMoveSummary,
	ImportProjectSelection,
	ImportSelection,
} from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { FolderService } from '@/services/folder.service';

import { projectHolding, type BranchLayout } from './branch-placement';
import type { CrossProjectMoves, InstanceProject } from './cross-project-moves';
import {
	applyMovedItems,
	classifyApplyMoves,
	describePlannedMoves,
	listPromoteMoves,
	markMovedResources,
	type ApplyMoveBlock,
	type MovedItem,
	type MoveProject,
	type MoveProjectAccess,
	type PromoteMoveList,
} from './project-moves';
import { PromotionAccessService } from './promotion-access.service';
import { PromotionsWorkflowsMovedCrossProjectError } from './promotions-selective-push.error';
import type { PromotionOperationInput } from './promotions.types';
import type { SelectivePushOptions } from './working-copy-updater';

type PlacedEntries = Pick<PackageManifest, 'projects' | 'folders' | 'workflows'>;

/** The projects of a package, as the Apply inventory lists them. */
type BranchProjects = ReadonlyArray<{ id: string; name: string }>;

/** An Apply plan of a selection, with the projects that the moves added to the selection. */
export type ApplySelectionMovePlan = ApplyMovePlan & { selection: ImportSelection };

/** An Apply plan with its moves between projects sorted into done and refused. */
export interface ApplyMovePlan {
	plan: PackageImportPlan;
	/** The moves that stop the Apply. They become `moved` conflicts. */
	refused: CrossProjectMoves;
	/** The moves that the Apply does. */
	plannedMoves: PromotionPlannedMove[];
	/** Each project that a planned move changes. */
	changedProjects: MoveProject[];
	/** Every move, for the moved rows of the preview. */
	movedItems: MovedItem[];
}

const NO_ACCESS: MoveProjectAccess & { existing: ReadonlySet<string> } = {
	covered: new Set(),
	operable: new Set(),
	readable: new Set(),
	names: new Map(),
	existing: new Set(),
};

/**
 * Connects the moves between team projects to the promotion operations (LIGO-1159).
 *
 * A move is one change of two projects. So an operation with a move needs the right of the
 * operation in each of the two projects, and the environment must cover both. A response names
 * the other project only when the user can read it.
 */
@Service()
export class PromotionMovesService {
	constructor(
		private readonly accessService: PromotionAccessService,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly folderService: FolderService,
	) {}

	/** What the user can do in each project that a move changes. */
	async access(
		user: User,
		input: PromotionOperationInput,
		direction: PromotionDirection,
		projectIds: Iterable<string>,
	): Promise<MoveProjectAccess & { existing: ReadonlySet<string> }> {
		const ids = [...new Set(projectIds)];
		if (ids.length === 0) return NO_ACCESS;
		const [covered, operable, readable, info, existing] = await Promise.all([
			this.accessService.coveredProjectIds(input, ids),
			this.accessService.operableProjectIds(user, direction, ids),
			this.accessService.readableProjectIds(user, ids),
			this.projectRepository.findTeamProjectInfoByIds(ids),
			this.projectRepository.findTypesByIds(ids),
		]);
		return {
			covered,
			operable: new Set([...operable].filter((id) => covered.has(id))),
			readable,
			names: new Map(info.map(({ id, name }) => [id, name])),
			existing: new Set(existing.map(({ id }) => id)),
		};
	}

	// -- Promote -------------------------------------------------------------

	/**
	 * The moves of a Promote of `operationProjectIds`: each workflow and folder that the branch
	 * holds under one project and this instance holds under another.
	 * - `branch`: where the branch holds each item.
	 * - `desired`: the manifest of the export of the operation.
	 * - `selected`: the selected ids of a selection Promote. Leave it out for a preview.
	 */
	async findPromoteMoves({
		user,
		branch,
		desired,
		operationProjectIds,
		selected,
	}: {
		user: User;
		branch: BranchLayout;
		desired: PlacedEntries;
		operationProjectIds: ReadonlySet<string>;
		selected?: { workflowIds: ReadonlySet<string>; folderIds: ReadonlySet<string> };
	}): Promise<PromoteMoveList> {
		// An item of the branch that the export lacks left its project when another project holds it.
		const leftProject = (collection: 'workflows' | 'folders') => {
			const exported = new Set((desired[collection] ?? []).map(({ id }) => id));
			return (branch[collection] ?? [])
				.filter(({ id, target }) => {
					const project = projectHolding(branch.projects, target);
					return !exported.has(id) && project !== undefined && operationProjectIds.has(project.id);
				})
				.map(({ id }) => id);
		};
		const [owners, folders, readableProjectIds] = await Promise.all([
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(leftProject('workflows')),
			this.folderService.getFoldersByIds(leftProject('folders')),
			this.accessService.readableProjectIds(user),
		]);
		return listPromoteMoves({
			branch,
			desired,
			owners,
			folderHomes: new Map<string, InstanceProject>(
				folders.map(({ id, homeProject }) => [id, homeProject]),
			),
			operationProjectIds,
			selected,
			readableProjectIds,
		});
	}

	/**
	 * Shows each move of a Promote preview as one moved row. A row of the new project gets
	 * `movedFromProject`. A row of the old project gets `movedToProject` when the view does not
	 * hold the new project.
	 */
	async markPromoteMoves({
		user,
		resources,
		branch,
		desired,
		projectIds,
	}: {
		user: User;
		resources: PromotionResource[];
		branch: PlacedEntries;
		desired: PlacedEntries;
		projectIds: readonly string[];
	}): Promise<PromotionResource[]> {
		const { moves, intoPersonalProject } = await this.findPromoteMoves({
			user,
			branch,
			desired,
			operationProjectIds: new Set(projectIds),
		});
		return markMovedResources(resources, [...moves, ...intoPersonalProject]);
	}

	/**
	 * Puts each selected workflow that another team project owns now under that project, so the
	 * Promote writes it there and removes it from its old place on the branch in the same commit.
	 * - `movedOwners`: the owner project of each selected workflow that its selection project does
	 *   not own.
	 * - A move into a personal project stops the Promote.
	 * - A project that the move adds to the operation needs the right of the user and the scope of
	 *   the environment.
	 */
	async withMovedWorkflows(
		user: User,
		input: PromotionOperationInput,
		selections: readonly SelectivePushOptions[],
		movedOwners: ReadonlyMap<string, InstanceProject>,
	): Promise<SelectivePushOptions[]> {
		const personal = [...movedOwners].filter(([, owner]) => owner.type !== 'team');
		if (personal.length > 0) {
			throw new PromotionsWorkflowsMovedCrossProjectError(
				personal.map(([id]) => ({ id })),
				'personal-project',
			);
		}

		const result = selections.map(
			(selection): SelectivePushOptions => ({
				...selection,
				workflowIds: [...selection.workflowIds],
				allowCrossProjectMoves: true,
			}),
		);
		const requested = new Set(result.map(({ projectId }) => projectId));
		for (const [id, owner] of movedOwners) {
			for (const selection of result) {
				selection.deletedWorkflowIds = selection.deletedWorkflowIds.filter(
					(deletedId) => deletedId !== id,
				);
			}
			let target = result.find(({ projectId }) => projectId === owner.id);
			if (!target) {
				target = {
					projectId: owner.id,
					workflowIds: [],
					deletedWorkflowIds: [],
					folderIds: [],
					allowCrossProjectMoves: true,
				};
				result.push(target);
			}
			if (!target.workflowIds.includes(id)) target.workflowIds.push(id);
		}

		const added = result.map(({ projectId }) => projectId).filter((id) => !requested.has(id));
		const access = await this.access(user, input, 'promote', added);
		for (const projectId of added) {
			if (!access.operable.has(projectId)) throw refusal('promote', projectId, access);
		}
		return result;
	}

	/**
	 * Checks the projects that the moves of a Promote change and that the selection does not hold.
	 * A project that no longer exists on this instance has no right to check: its items already
	 * left it here, and the branch follows.
	 */
	async assertCanPromoteMoves(
		user: User,
		input: PromotionOperationInput,
		{ moves, otherProjectIds }: PromoteMoveList,
	): Promise<string[]> {
		const access = await this.access(user, input, 'promote', otherProjectIds);
		const checked = otherProjectIds.filter((id) => access.existing.has(id));
		for (const projectId of checked) {
			if (access.operable.has(projectId)) continue;
			const move = moves.find(
				({ fromProject, toProject }) => fromProject.id === projectId || toProject.id === projectId,
			);
			throw refusal('promote', projectId, access, move);
		}
		return checked;
	}

	// -- Apply ---------------------------------------------------------------

	/**
	 * Plans the Apply of a selection with its moves between projects.
	 *
	 * - `selections`: the selection of each project. It holds one project or more.
	 * - `movedOutWorkflowIds`: workflows that the user selected under the project that holds them
	 *   on this instance, while the branch holds them under another project. They join the
	 *   selection of the branch project.
	 * - `known`: every move between the package and this instance. `relevant`: the ones that this
	 *   operation touches.
	 * - `confirmable`: the Apply can move an item out of a project that the branch does not hold,
	 *   after a confirmation. False for a project Apply.
	 * - `plan`: plans a selection. It can run two times.
	 *
	 * The old project of a move joins the operation when the branch holds it, the environment
	 * covers it and the user can apply in it. So the Apply writes both projects in one plan.
	 */
	async planApply({
		user,
		input,
		branchProjects,
		selections,
		movedOutWorkflowIds = new Set(),
		known,
		relevant,
		confirmable,
		plan: planSelection,
	}: {
		user: User;
		input: PromotionOperationInput;
		branchProjects: BranchProjects;
		selections: readonly [ImportProjectSelection, ...ImportProjectSelection[]];
		movedOutWorkflowIds?: ReadonlySet<string>;
		known: CrossProjectMoves;
		relevant: CrossProjectMoves;
		confirmable: boolean;
		plan: (selection: ImportSelection) => Promise<PackageImportPlan>;
	}): Promise<ApplySelectionMovePlan> {
		const branchProjectIds = new Set(branchProjects.map(({ id }) => id));
		const [first, ...others] = selections.map((selection) => ({ ...selection }));
		const current = [first, ...others];
		const emptySelection = (projectId: string): ImportProjectSelection => ({
			selectedProjectId: projectId,
			selectedWorkflowIds: [],
			deletedWorkflowIds: [],
			selectedFolderIds: [],
		});
		const refusedBefore: Array<{ kind: 'workflow'; id: string; blockedBy: ApplyMoveBlock }> = [];

		if (movedOutWorkflowIds.size > 0) {
			// `toInstanceProject` names team projects only. A personal project is never a move.
			const movedOut = known.workflows.filter(
				({ id, instanceProject }) =>
					movedOutWorkflowIds.has(id) && instanceProject.name !== undefined,
			);
			const inOperation = new Set(current.map(({ selectedProjectId }) => selectedProjectId));
			const access = await this.access(
				user,
				input,
				'apply',
				movedOut.map(({ project }) => project.id).filter((id) => !inOperation.has(id)),
			);
			for (const { id, project } of movedOut) {
				let target = current.find(({ selectedProjectId }) => selectedProjectId === project.id);
				if (!target) {
					if (!access.operable.has(project.id)) {
						refusedBefore.push({
							kind: 'workflow',
							id,
							blockedBy: access.covered.has(project.id)
								? 'other-project-forbidden'
								: 'other-project-not-covered',
						});
						continue;
					}
					target = emptySelection(project.id);
					current.push(target);
				}
				if (!target.selectedWorkflowIds.includes(id)) {
					target.selectedWorkflowIds = [...target.selectedWorkflowIds, id];
				}
			}
		}

		const toSelection = (): ImportSelection => {
			const otherProjects = current.slice(1);
			return otherProjects.length > 0 ? { ...first, otherProjects } : first;
		};
		let plan = await planSelection(toSelection());

		// The plan tells which old projects the operation lacks. A folder above a selected
		// workflow can be a move too, so the selection alone does not tell.
		const missing = [
			...new Set(
				(plan.crossProjectMoves?.moves ?? [])
					.filter(
						({ fromProjectInOperation, fromProjectId }) =>
							!fromProjectInOperation && branchProjectIds.has(fromProjectId),
					)
					.map(({ fromProjectId }) => fromProjectId),
			),
		];
		const missingAccess = await this.access(user, input, 'apply', missing);
		const added = missing.filter((id) => missingAccess.operable.has(id));
		if (added.length > 0) {
			current.push(...added.map(emptySelection));
			plan = await planSelection(toSelection());
		}

		return {
			...(await this.describeApplyPlan({
				user,
				input,
				branchProjects,
				plan,
				known,
				relevant,
				refusedBefore,
				confirmable,
			})),
			selection: toSelection(),
		};
	}

	/**
	 * Sorts the moves of an Apply plan into the ones that the Apply does and the ones that stop it.
	 * An Apply of the whole package calls it with its plan. `planApply` describes its fields.
	 */
	async describeApplyPlan({
		user,
		input,
		branchProjects,
		plan,
		known,
		relevant,
		refusedBefore = [],
		confirmable,
	}: {
		user: User;
		input: PromotionOperationInput;
		branchProjects: BranchProjects;
		plan: PackageImportPlan;
		known: CrossProjectMoves;
		relevant: CrossProjectMoves;
		refusedBefore?: ReadonlyArray<{ kind: 'workflow'; id: string; blockedBy: ApplyMoveBlock }>;
		confirmable: boolean;
	}): Promise<ApplyMovePlan> {
		const planned = plan.crossProjectMoves?.moves ?? [];
		const access = await this.access(user, input, 'apply', [
			...planned.flatMap(({ fromProjectId, toProjectId }) => [fromProjectId, toProjectId]),
			...[...known.workflows, ...known.folders].flatMap(({ project, instanceProject }) => [
				project.id,
				instanceProject.id,
			]),
		]);
		const { allowed, refused } = classifyApplyMoves({
			planned,
			known,
			relevant,
			refusedBefore,
			branchProjects,
			access,
			confirmable,
		});
		// The Apply creates a project that this instance lacks, so the user reads it in the package.
		const readable = new Set([
			...access.readable,
			...branchProjects.map(({ id }) => id).filter((id) => !access.existing.has(id)),
		]);
		const { plannedMoves, changedProjects } = describePlannedMoves(
			allowed,
			new Map([...access.names, ...branchProjects.map(({ id, name }) => [id, name] as const)]),
			readable,
		);

		return {
			plan,
			refused,
			plannedMoves,
			changedProjects,
			movedItems: applyMovedItems(plannedMoves, refused),
		};
	}

	/** The moves that an Apply did, as the result shows them. */
	async describeAppliedMoves(
		user: User,
		input: PromotionOperationInput,
		moves: readonly CrossProjectMoveSummary[] = [],
	): Promise<PromotionAppliedMove[]> {
		if (moves.length === 0) return [];
		const access = await this.access(
			user,
			input,
			'apply',
			moves.flatMap(({ fromProjectId, toProjectId }) => [fromProjectId, toProjectId]),
		);
		const named = (id: string): MoveProject => {
			const name = access.names.get(id);
			return access.readable.has(id) && name !== undefined ? { id, name } : { id };
		};
		return moves.map(({ kind, id, name, fromProjectId, toProjectId, unpublished }) => ({
			kind,
			id,
			name,
			fromProject: named(fromProjectId),
			toProject: named(toProjectId),
			...(unpublished ? { unpublished } : {}),
		}));
	}
}

/** The fields of the Apply check that describe the moves. Empty lists are left out. */
export function moveCheckFields({
	plannedMoves,
	changedProjects,
}: Pick<ApplyMovePlan, 'plannedMoves' | 'changedProjects'>): Pick<
	PromotionApplyCheck,
	'plannedMoves' | 'changedProjects'
> {
	return plannedMoves.length > 0 ? { plannedMoves, changedProjects } : {};
}

/** A planned move out of a project that the branch does not hold waits for the confirmation. */
export function hasUnconfirmedMoves(check: PromotionApplyCheck): boolean {
	return (check.plannedMoves ?? []).some(({ needsConfirmation }) => needsConfirmation);
}

/** The refusal of a move that changes a project where the user cannot run the operation. */
function refusal(
	direction: PromotionDirection,
	projectId: string,
	access: MoveProjectAccess,
	item?: { kind: 'workflow' | 'folder'; name: string },
): Error {
	const name = access.names.get(projectId);
	// Name the other project only when the user can read it.
	const project =
		access.readable.has(projectId) && name !== undefined ? `project "${name}"` : 'another project';
	const what = item ? `The move of ${item.kind} "${item.name}"` : 'A move in this selection';
	if (!access.covered.has(projectId)) {
		return new BadRequestError(
			`${what} also changes ${project}, and this environment does not cover that project.`,
		);
	}
	return new ForbiddenError(
		`${what} also changes ${project}. You do not have the right to ${direction} in that project. Ask a project admin or an instance admin.`,
	);
}
