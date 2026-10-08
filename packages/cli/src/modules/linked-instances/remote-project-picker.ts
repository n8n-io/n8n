import type { LinkedInstanceRemoteProject, ProjectType } from '@n8n/api-types';

/** A project that the remote `search_projects` tool listed for the token's user. */
export type RemoteProject = LinkedInstanceRemoteProject & { type: ProjectType };

export type RemoteProjectList = {
	projects: readonly RemoteProject[];
	/** `false` when the linked instance has no licence for team projects. */
	teamProjectsEnabled: boolean;
};

const isTeam = (project: RemoteProject) => project.type === 'team';
const isPersonal = (project: RemoteProject) => project.type === 'personal';

/**
 * Chooses where new automations go on a linked instance: the first listed team project, so that
 * teammates see them, else the personal project. The instance does not tell which projects the
 * user can create workflows in, so the user can change the choice. Without a licence for team
 * projects, the instance itself advises the personal project.
 * @returns one of the listed projects, or `null` when no project fits
 */
export function pickDefaultRemoteProject(list: RemoteProjectList): RemoteProject | null {
	const team = list.teamProjectsEnabled ? list.projects.find(isTeam) : undefined;
	return team ?? list.projects.find(isPersonal) ?? null;
}

/**
 * Keeps the current default project while the instance still lists it, and then returns the
 * listed project, so that a renamed project shows its new name. Otherwise picks a new default.
 * @returns one of the listed projects, or `null` when no project fits
 */
export function reconcileDefaultRemoteProject(
	current: LinkedInstanceRemoteProject | null,
	list: RemoteProjectList,
): RemoteProject | null {
	const listed = current && list.projects.find((project) => project.id === current.id);
	return listed ?? pickDefaultRemoteProject(list);
}
