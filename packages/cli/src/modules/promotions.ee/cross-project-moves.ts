import type { ApplyCheckResult } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

import type { PackageDirectoryInventory } from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';

export type CrossProjectMove = ApplyCheckResult['movedWorkflows'][number];

export type CrossProjectMoves = {
	workflows: CrossProjectMove[];
	folders: CrossProjectMove[];
	/** Instance projects that are personal. The refusal message names none of them. */
	personalProjectIds: ReadonlySet<string>;
};

/** A project on this instance that holds a workflow or folder of the package. */
export type InstanceProject = { id: string; name: string; type: string };

type Inventory = Pick<PackageDirectoryInventory, 'projects' | 'workflows' | 'folders'>;

/** The import of a project reads only the folders that the package holds under it. */
export function foldersInScope(folders: Inventory['folders'], projectId?: string) {
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
						instanceProject: { id: here.id, name: here.name },
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
		// A personal project's name holds its owner's email, and the refusal reaches the UI and
		// telemetry.
		personalProjectIds: new Set(
			[...owners.values(), ...folderHomes.values()]
				.filter(({ type }) => type !== 'team')
				.map(({ id }) => id),
		),
	};
}

/**
 * Names each item and both of its projects, so the user knows what to move and where. An item
 * can't move here to a branch project that does not exist here yet, so then only the source fix
 * is offered.
 */
export function describeCrossProjectMoves({
	workflows,
	folders,
	personalProjectIds,
}: CrossProjectMoves): string {
	const here = ({ id, name }: CrossProjectMove['instanceProject']) =>
		personalProjectIds.has(id) ? 'a personal project' : `project "${name}"`;
	const describe =
		(type: 'workflow' | 'folder') =>
		({ id, name, project, projectExists, instanceProject }: CrossProjectMove) =>
			`${type} "${name}" (${id}) is in ${here(instanceProject)} here and in project "${project.name}" on the branch${projectExists ? '' : `, and project "${project.name}" does not exist on this instance yet`}`;
	const moved = [...workflows.map(describe('workflow')), ...folders.map(describe('folder'))];
	const remedy = [...workflows, ...folders].every(({ projectExists }) => projectExists)
		? 'Move them on this instance to match the branch, or move them back on the source instance and promote again.'
		: 'Move them back on the source instance, then promote again.';
	return `Apply can't move workflows or folders between projects: ${moved.join('; ')}. ${remedy}`;
}
