import type {
	PromotionDeletionCallers,
	PromotionPlannedMove,
	PromotionPreviewCheck,
	PromotionResource,
} from '@n8n/api-types';

import type { PlannedCrossProjectMove } from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { isUnder, projectHolding, type BranchLayout } from './branch-placement';

/**
 * Moves between team projects that Promote writes and Apply transfers (LIGO-1159).
 *
 * Entry points for the promotion services:
 * - Promote: `listPromoteMoves`, `selectionWithMoves`, `describeMovesIntoPersonalProjects`,
 *   `movesIntoPersonalProjects`, `markMovedResources`, `promoteDeletionCallers`.
 * - Apply: `describePlannedMoves`, `refusedApplyMoves`, `markMovedResources`.
 *
 * Every function is pure. The caller reads the branch, the instance and the access of the user.
 */

type BlockingMove = PromotionPreviewCheck['movedWorkflows'][number];
type BlockingMoves = { workflows: BlockingMove[]; folders: BlockingMove[] };

/** A project on this instance. */
type InstanceProject = { id: string; name: string; type: string };

/** A project as a moved row names it. `name` is set only when the user can access the project. */
export type MoveProject = { id: string; name?: string };

/** A workflow or folder that the branch holds under one project and this instance under another. */
export interface PromoteMove {
	kind: 'workflow' | 'folder';
	id: string;
	name: string;
	/** The project that holds the item on the branch. */
	fromProject: MoveProject;
	/** The project that holds the item on this instance. */
	toProject: MoveProject;
	/**
	 * The item is not in the export. It is inside a moved folder on the branch, and the branch
	 * directory of that folder moves with all its content.
	 */
	carried?: true;
}

export interface PromoteMoveList {
	/** Moves between two team projects. The Promote writes each one as one change. */
	moves: PromoteMove[];
	/** Moves into a personal project. The Promote stops, in both modes. */
	intoPersonalProject: PromoteMove[];
	/**
	 * Each project that a move changes and that the operation does not hold. The caller adds them
	 * to the operation and checks the right of the user in each. Empty for an instance Promote.
	 */
	otherProjectIds: string[];
}

/** One project of a selection across projects. */
export interface PromoteSelectionEntry {
	projectId: string;
	workflowIds: string[];
	folderIds: string[];
}

type PlacedEntries = Pick<PackageManifest, 'projects' | 'folders' | 'workflows'>;

/**
 * Lists the moves of a Promote.
 *
 * - `branch`: where the branch holds each item (`WorkingCopyUpdater.scanBranch` or the branch
 *   manifest).
 * - `desired`: the manifest of the export of the operation: the selected projects for a preview,
 *   the staging export for a selection Promote, the instance export for an instance Promote.
 * - `owners` and `folderHomes`: the project on this instance of each branch item that `desired`
 *   does not hold. Such an item left a project of the operation.
 * - `operationProjectIds`: the projects of the selection. Leave it out for an instance Promote.
 * - `selected`: the selected ids of a selection Promote. Then only a selected item counts as an
 *   item that left its project, and the content of a moved folder counts as carried. Leave it out
 *   for a preview and for an instance Promote.
 * - `readableProjectIds`: the projects that the user can access. A move names only these.
 */
export function listPromoteMoves({
	branch,
	desired,
	owners,
	folderHomes,
	operationProjectIds,
	selected,
	readableProjectIds,
}: {
	branch: BranchLayout;
	desired: PlacedEntries;
	owners: ReadonlyMap<string, InstanceProject>;
	folderHomes: ReadonlyMap<string, InstanceProject>;
	operationProjectIds?: ReadonlySet<string>;
	selected?: { workflowIds: ReadonlySet<string>; folderIds: ReadonlySet<string> };
	readableProjectIds: ReadonlySet<string>;
}): PromoteMoveList {
	const named = ({ id, name }: { id: string; name?: string }): MoveProject =>
		readableProjectIds.has(id) && name !== undefined ? { id, name } : { id };
	const moves: PromoteMove[] = [];
	const intoPersonalProject: PromoteMove[] = [];
	const movedFolderTargets: Array<{ target: string; toProject: MoveProject }> = [];
	const seen = new Set<string>();

	const kinds = [
		{ kind: 'folder', collection: 'folders', instance: folderHomes },
		{ kind: 'workflow', collection: 'workflows', instance: owners },
	] as const;

	for (const { kind, collection, instance } of kinds) {
		const desiredById = new Map((desired[collection] ?? []).map((entry) => [entry.id, entry]));
		const selectedIds = kind === 'folder' ? selected?.folderIds : selected?.workflowIds;

		for (const entry of branch[collection] ?? []) {
			const branchProject = projectHolding(branch.projects, entry.target);
			if (!branchProject) continue;
			const base = { kind, id: entry.id, name: entry.name, fromProject: named(branchProject) };

			const exported = desiredById.get(entry.id);
			if (exported) {
				const project = projectHolding(desired.projects, exported.target);
				if (!project || project.id === branchProject.id) continue;
				moves.push({ ...base, toProject: named(project) });
				seen.add(`${kind}:${entry.id}`);
				if (kind === 'folder') {
					movedFolderTargets.push({ target: entry.target, toProject: named(project) });
				}
				continue;
			}

			// The export does not hold the item. It left its project when another project holds it now.
			if (operationProjectIds && !operationProjectIds.has(branchProject.id)) continue;
			if (selectedIds && !selectedIds.has(entry.id)) continue;
			const here = instance.get(entry.id);
			if (!here || here.id === branchProject.id) continue;
			seen.add(`${kind}:${entry.id}`);
			if (here.type === 'team') moves.push({ ...base, toProject: named(here) });
			// A personal project is never named: its name holds the email of its owner.
			else intoPersonalProject.push({ ...base, toProject: { id: here.id } });
		}
	}

	// The write moves the branch directory of a moved folder, so its other content moves with it.
	if (selected) {
		for (const { kind, collection } of kinds) {
			for (const entry of branch[collection] ?? []) {
				if (seen.has(`${kind}:${entry.id}`)) continue;
				const carrier = movedFolderTargets
					.filter(({ target }) => isUnder(entry.target, target))
					.sort((a, b) => b.target.length - a.target.length)[0];
				const branchProject = projectHolding(branch.projects, entry.target);
				if (!carrier || !branchProject || branchProject.id === carrier.toProject.id) continue;
				moves.push({
					kind,
					id: entry.id,
					name: entry.name,
					fromProject: named(branchProject),
					toProject: carrier.toProject,
					carried: true,
				});
			}
		}
	}

	const otherProjectIds = operationProjectIds
		? [
				...new Set(
					moves
						.flatMap(({ fromProject, toProject }) => [fromProject.id, toProject.id])
						.filter((id) => !operationProjectIds.has(id)),
				),
			].sort()
		: [];
	const byKey = (a: PromoteMove, b: PromoteMove) =>
		`${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`);

	return {
		moves: moves.sort(byKey),
		intoPersonalProject: intoPersonalProject.sort(byKey),
		otherProjectIds,
	};
}

/**
 * Puts each moved item under the project that holds it on this instance. The user can select a
 * moved row on the page of the old project or of the new project. The export and the branch write
 * need it under the new project: the write of that project removes the old branch path and adds
 * the new one in the same working copy, so one commit holds both sides.
 */
export function selectionWithMoves(
	selection: readonly PromoteSelectionEntry[],
	moves: readonly PromoteMove[],
): PromoteSelectionEntry[] {
	const entries = new Map(
		selection.map(({ projectId, workflowIds, folderIds }) => [
			projectId,
			{ projectId, workflowIds: [...workflowIds], folderIds: [...folderIds] },
		]),
	);
	const entryOf = (projectId: string) => {
		const entry = entries.get(projectId) ?? { projectId, workflowIds: [], folderIds: [] };
		entries.set(projectId, entry);
		return entry;
	};

	for (const { kind, id, fromProject, toProject, carried } of moves) {
		if (carried) continue;
		const field = kind === 'workflow' ? 'workflowIds' : 'folderIds';
		const from = entryOf(fromProject.id);
		const to = entryOf(toProject.id);
		const wasSelected = from[field].includes(id) || to[field].includes(id);
		from[field] = from[field].filter((selectedId) => selectedId !== id);
		if (wasSelected && !to[field].includes(id)) to[field].push(id);
	}

	return [...entries.values()];
}

/** The Promote refusal for a move into a personal project. It names each item, never the project. */
export function describeMovesIntoPersonalProjects(moves: readonly PromoteMove[]): string {
	const items = moves
		.map(({ kind, id, name }) => `${kind} "${name}" (${id})`)
		.sort()
		.join(', ');
	return `Promote can't move a workflow or folder into a personal project: ${items}. A personal project is never on the branch, so the destination would delete the item. Move it to a team project or delete it on this instance, then promote again.`;
}

/**
 * The moves of the instance Promote check (`crossProjectMoves`) that still stop the Promote: the
 * ones into a personal project. A move between two team projects reaches the branch.
 */
export function movesIntoPersonalProjects(moves: BlockingMoves): BlockingMoves {
	// `toInstanceProject` leaves the name out for a personal project only.
	const personal = ({ instanceProject }: BlockingMove) => instanceProject.name === undefined;
	return { workflows: moves.workflows.filter(personal), folders: moves.folders.filter(personal) };
}

/** What a moved row needs: the item and both projects. Promote and Apply moves both fit. */
type MovedItem = {
	kind: 'workflow' | 'folder';
	id: string;
	fromProject: MoveProject;
	toProject: MoveProject;
};

/**
 * Shows each move as one row. A comparison across projects gives a deleted row under the old
 * project and an added row under the new project. The deleted row goes, and the other row gets
 * `movedFromProject`. On the page of the old project alone, the deleted row stays and gets
 * `movedToProject`. Both rows stay selectable.
 */
export function markMovedResources(
	resources: readonly PromotionResource[],
	moves: readonly MovedItem[],
): PromotionResource[] {
	const moveOf = new Map(moves.map((move) => [`${move.kind}:${move.id}`, move]));
	const keyOf = ({ type, id }: PromotionResource) => `${type}:${id}`;
	const arrived = new Set(
		resources
			.filter((resource) => resource.change !== 'deleted' && moveOf.has(keyOf(resource)))
			.map(keyOf),
	);

	return resources.flatMap((resource) => {
		const move = moveOf.get(keyOf(resource));
		if (!move) return [resource];
		if (resource.change !== 'deleted') return [{ ...resource, movedFromProject: move.fromProject }];
		return arrived.has(keyOf(resource)) ? [] : [{ ...resource, movedToProject: move.toProject }];
	});
}

/**
 * The moves of an Apply plan as the preview and the API response show them.
 *
 * - `planned`: `plan.crossProjectMoves.moves` of the import plan.
 * - `projectNames`: the name of each project, from the branch inventory and from this instance.
 * - `readableProjectIds`: the projects that the user can access. A move names only these.
 *
 * `needsConfirmation` lists the moves out of a project that the branch does not hold. An instance
 * Apply does them after the user confirms the destructive changes (the request then sets
 * `confirmedMovesOutOfOperation`). A project Apply refuses them.
 */
export function describePlannedMoves(
	planned: readonly PlannedCrossProjectMove[],
	projectNames: ReadonlyMap<string, string>,
	readableProjectIds: ReadonlySet<string>,
): {
	plannedMoves: PromotionPlannedMove[];
	needsConfirmation: PromotionPlannedMove[];
	changedProjects: MoveProject[];
} {
	const named = (id: string): MoveProject => {
		const name = projectNames.get(id);
		return readableProjectIds.has(id) && name !== undefined ? { id, name } : { id };
	};
	const plannedMoves = planned
		.map(
			(move): PromotionPlannedMove => ({
				kind: move.kind,
				id: move.id,
				name: move.name,
				fromProject: named(move.fromProjectId),
				toProject: named(move.toProjectId),
				needsConfirmation: !move.fromProjectInOperation,
				...(move.losesShares ? { losesShares: true } : {}),
			}),
		)
		.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
	const changedProjectIds = [
		...new Set(planned.flatMap(({ fromProjectId, toProjectId }) => [fromProjectId, toProjectId])),
	].sort();

	return {
		plannedMoves,
		needsConfirmation: plannedMoves.filter(({ needsConfirmation }) => needsConfirmation),
		changedProjects: changedProjectIds.map(named),
	};
}

/**
 * The moves that still stop an Apply as `moved` conflicts, from the list of `crossProjectMoves`.
 * A move that the plan transfers is not a conflict. The plan does not hold a move from or to a
 * personal project. With `confirmable: false` (a project Apply), a move out of a project that the
 * operation does not hold stops the Apply too.
 */
export function refusedApplyMoves(
	moves: BlockingMoves,
	planned: readonly PlannedCrossProjectMove[],
	{ confirmable }: { confirmable: boolean },
): BlockingMoves {
	const transferred = new Set(
		planned
			.filter(({ fromProjectInOperation }) => confirmable || fromProjectInOperation)
			.map(({ kind, id }) => `${kind}:${id}`),
	);
	return {
		workflows: moves.workflows.filter(({ id }) => !transferred.has(`workflow:${id}`)),
		folders: moves.folders.filter(({ id }) => !transferred.has(`folder:${id}`)),
	};
}

/**
 * Promote of a deletion: the workflows on the branch that call a workflow that the Promote
 * removes. The source has the same broken reference, so this is a warning and the Promote
 * continues. A caller that the user cannot access is counted, not named.
 *
 * - `branchManifest`: the manifest on the branch. Its workflow requirement rows name the callers.
 * - `rewrittenWorkflowIds`: the workflows that the same Promote writes. Their references come
 *   from this instance, so the branch rows do not count for them.
 */
export function promoteDeletionCallers({
	deletedWorkflowIds,
	branchManifest,
	rewrittenWorkflowIds = [],
	readableProjectIds,
}: {
	deletedWorkflowIds: readonly string[];
	branchManifest: Pick<PackageManifest, 'projects' | 'workflows' | 'requirements'>;
	rewrittenWorkflowIds?: readonly string[];
	readableProjectIds: ReadonlySet<string>;
}): PromotionDeletionCallers[] {
	const gone = new Set([...deletedWorkflowIds, ...rewrittenWorkflowIds]);
	const onBranch = new Map((branchManifest.workflows ?? []).map((entry) => [entry.id, entry]));
	const rows = new Map(
		(branchManifest.requirements?.workflows ?? []).map((row) => [row.id, row.usedBy]),
	);

	return deletedWorkflowIds
		.flatMap((id): PromotionDeletionCallers[] => {
			const target = onBranch.get(id);
			const callerIds = [
				...new Set(
					(rows.get(id) ?? [])
						.filter((consumer) => consumer.kind === 'workflow' && !gone.has(consumer.id))
						.map((consumer) => consumer.id),
				),
			];
			if (!target || callerIds.length === 0) return [];

			const callers: PromotionDeletionCallers['callers'] = [];
			let hiddenCallerCount = 0;
			for (const callerId of callerIds) {
				const caller = onBranch.get(callerId);
				if (!caller) continue;
				const project = projectHolding(branchManifest.projects, caller.target);
				if (project && readableProjectIds.has(project.id)) {
					callers.push({ id: caller.id, name: caller.name, projectId: project.id });
				} else {
					hiddenCallerCount += 1;
				}
			}
			if (callers.length === 0 && hiddenCallerCount === 0) return [];

			return [
				{
					target: { id: target.id, name: target.name },
					callers: callers.sort((a, b) => a.id.localeCompare(b.id)),
					hiddenCallerCount,
				},
			];
		})
		.sort((a, b) => a.target.id.localeCompare(b.target.id));
}
