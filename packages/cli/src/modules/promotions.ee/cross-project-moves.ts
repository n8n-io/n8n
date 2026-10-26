import type { ApplyCheckResult } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

export type CrossProjectMove = ApplyCheckResult['movedWorkflows'][number];

export type CrossProjectMoves = {
	workflows: CrossProjectMove[];
	folders: CrossProjectMove[];
};

/** A project on this instance that holds a workflow or folder of the package. */
export type InstanceProject = { id: string; name: string; type: string };

/** Where the package holds each workflow and folder. The Apply inventory and the branch manifest both fit. */
type Inventory = {
	projects: ReadonlyArray<{ id: string; name: string }>;
	workflows: ReadonlyArray<{ id: string; name: string; projectId: string }>;
	folders: ReadonlyArray<{ projectId: string; folder: { id: string; name: string } }>;
};

/** The import of a project reads only the folders that the package holds under it. */
export function foldersInScope<F extends Inventory['folders'][number]>(
	folders: readonly F[],
	projectId?: string,
): F[] {
	return folders.filter((entry) => projectId === undefined || entry.projectId === projectId);
}

/**
 * Workflows and folders that the package holds under one project and this instance holds under
 * another. Apply cannot move them between projects. With `projectId`, workflows count when they
 * move into or out of that project, and folders only when the package holds them under it.
 */
export function crossProjectMoves({
	inventory,
	owners,
	folderHomes,
	existingProjectIds,
	projectId,
}: {
	inventory: Inventory;
	owners: ReadonlyMap<string, InstanceProject>;
	folderHomes: ReadonlyMap<string, InstanceProject>;
	existingProjectIds: ReadonlySet<string>;
	projectId?: string;
}): CrossProjectMoves {
	const branchProjects = new Map(inventory.projects.map(({ id, name }) => [id, { id, name }]));
	const branchProjectOf = (id: string) => {
		const project = branchProjects.get(id);
		// The reader requires a project file for every project directory.
		if (!project) throw new UnexpectedError(`Package inventory has no project "${id}"`);
		return project;
	};
	const touchesProject = (branchProjectId: string, instanceProjectId: string) =>
		projectId === undefined || projectId === branchProjectId || projectId === instanceProjectId;
	const toMove = (
		{ id, name }: { id: string; name: string },
		branchProjectId: string,
		here: InstanceProject | undefined,
	): CrossProjectMove[] =>
		here && here.id !== branchProjectId && touchesProject(branchProjectId, here.id)
			? [
					{
						id,
						name,
						project: branchProjectOf(branchProjectId),
						projectExists: existingProjectIds.has(branchProjectId),
						instanceProject: toInstanceProject(here),
					},
				]
			: [];
	const byId = (a: CrossProjectMove, b: CrossProjectMove) => a.id.localeCompare(b.id);

	return {
		workflows: inventory.workflows
			.flatMap((workflow) => toMove(workflow, workflow.projectId, owners.get(workflow.id)))
			.sort(byId),
		folders: foldersInScope(inventory.folders, projectId)
			.flatMap(({ folder, projectId: branchProjectId }) =>
				toMove(folder, branchProjectId, folderHomes.get(folder.id)),
			)
			.sort(byId),
	};
}

/** A personal project's name holds its owner's email, and moves reach the UI and telemetry. */
export function toInstanceProject({
	id,
	name,
	type,
}: InstanceProject): CrossProjectMove['instanceProject'] {
	return type === 'team' ? { id, name } : { id };
}

/** One line per item, with both of its projects. A personal project is never named. */
function describeItems({ workflows, folders }: CrossProjectMoves): string {
	const here = ({ name }: CrossProjectMove['instanceProject']) =>
		name === undefined ? 'a personal project' : `project "${name}"`;
	const describe =
		(type: 'workflow' | 'folder') =>
		({ id, name, project, projectExists, instanceProject }: CrossProjectMove) =>
			`${type} "${name}" (${id}) is in ${here(instanceProject)} here and in project "${project.name}" on the branch${projectExists ? '' : `, and project "${project.name}" does not exist on this instance yet`}`;
	return [...workflows.map(describe('workflow')), ...folders.map(describe('folder'))].join('; ');
}

/**
 * The Apply refusal. An item can't move here to a branch project that does not exist here yet, so
 * then only the source fix is offered.
 */
export function describeCrossProjectMoves(moves: CrossProjectMoves): string {
	const remedy = [...moves.workflows, ...moves.folders].every(({ projectExists }) => projectExists)
		? 'Move them on this instance to match the branch, or move them back on the source instance and promote again.'
		: 'Move them back on the source instance, then promote again.';
	return `Apply can't move workflows or folders between projects: ${describeItems(moves)}. ${remedy}`;
}

/** The promote refusal: the branch would hold a move that Apply then refuses. */
export function describePromotedMoves(moves: CrossProjectMoves): string {
	return `Promote can't move workflows or folders between projects, because Apply would refuse them on the destination: ${describeItems(moves)}. Move them back on this instance, then promote again.`;
}
