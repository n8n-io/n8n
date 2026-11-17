import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import { getWorkflowConsumerIds } from '../spec/requirement-consumers';

/**
 * A data table or a project variable that a workflow of one project uses and that another
 * project of the package owns. Neither resource can cross a project, so the reference does not
 * resolve in the project of the workflow.
 */
export type CrossProjectResource = {
	kind: 'dataTable' | 'variable';
	/** The id of a data table. A variable has only a name. */
	id?: string;
	name: string;
	consumerWorkflowId: string;
	consumerProjectId: string;
	/** Not set for a data table that the package references and does not hold. */
	ownerProjectId?: string;
};

/**
 * Lists the references of the package to a data table or a project variable of another project.
 * The folder of a file names its owner:
 *
 * - A data table whose file is under another project folder, or that has no file at all.
 * - A variable name that the project of the workflow and the top level do not hold, and that
 *   another project folder holds.
 *
 * A data table file at the top level has no owner, so it follows the usual rules.
 */
export function findCrossProjectResources(manifest: PackageManifest): CrossProjectResource[] {
	const projects = manifest.projects ?? [];
	const projectOf = ({ target }: Pick<ManifestEntry, 'target'>) =>
		projects.find((project) => target.startsWith(`${project.target}/`));
	const workflowProject = new Map<string, string>();
	for (const workflow of manifest.workflows ?? []) {
		const project = projectOf(workflow);
		if (project) workflowProject.set(workflow.id, project.id);
	}

	const found: CrossProjectResource[] = [];
	const tables = new Map((manifest.dataTables ?? []).map((entry) => [entry.id, entry]));
	for (const row of manifest.requirements?.dataTables ?? []) {
		const entry = tables.get(row.id);
		const owner = entry && projectOf(entry);
		// A file outside every project folder has no owner.
		if (entry && !owner) continue;
		for (const consumerWorkflowId of getWorkflowConsumerIds(row)) {
			const consumerProjectId = workflowProject.get(consumerWorkflowId);
			if (consumerProjectId === undefined || owner?.id === consumerProjectId) continue;
			found.push({
				kind: 'dataTable',
				id: row.id,
				name: row.name,
				consumerWorkflowId,
				consumerProjectId,
				...(owner ? { ownerProjectId: owner.id } : {}),
			});
		}
	}

	for (const row of manifest.requirements?.variables ?? []) {
		const files = (manifest.variables ?? []).filter(({ name }) => name === row.name);
		if (files.length === 0) continue;
		for (const consumerWorkflowId of getWorkflowConsumerIds(row)) {
			const consumerProjectId = workflowProject.get(consumerWorkflowId);
			if (consumerProjectId === undefined) continue;
			// The project of the workflow resolves its own variable first, then a global one.
			const resolves = files.some((file) => {
				const owner = projectOf(file);
				return owner === undefined || owner.id === consumerProjectId;
			});
			if (resolves) continue;
			const owner = files.map(projectOf).find((project) => project !== undefined);
			found.push({
				kind: 'variable',
				name: row.name,
				consumerWorkflowId,
				consumerProjectId,
				...(owner ? { ownerProjectId: owner.id } : {}),
			});
		}
	}
	return found;
}
