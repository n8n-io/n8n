import { getResourcePermissions } from '@n8n/permissions';
import type { Scope } from '@n8n/permissions';
import { ProjectTypes, type ProjectType } from '@/features/collaboration/projects/projects.types';

/** A project the user can see, with what the default-project rule needs to know. */
export interface DefaultProjectCandidate {
	id: string;
	type: ProjectType;
	canCreateWorkflow: boolean;
}

export interface DefaultProjectInput {
	/** The `projectId` of the URL. It always wins. */
	queryProjectId?: string;
	/** The team project in which this user last started a chat. */
	lastUsedProjectId?: string;
	/** The projects of the user. The caller gives an empty list when team projects are not licensed. */
	projects: readonly DefaultProjectCandidate[];
	personalProjectId?: string;
}

/**
 * Chooses the project for a new Simple-mode chat: the URL project, else the last-used team
 * project while the user can still create workflows in it, else the personal project.
 * A deleted project or a lost role is not in `projects` any more, so the rule falls back.
 */
export function chooseDefaultProject({
	queryProjectId,
	lastUsedProjectId,
	projects,
	personalProjectId,
}: DefaultProjectInput): string | undefined {
	if (queryProjectId) return queryProjectId;
	if (!lastUsedProjectId) return personalProjectId;
	const lastUsed = projects.find(
		(project) =>
			project.id === lastUsedProjectId &&
			project.type === ProjectTypes.Team &&
			project.canCreateWorkflow,
	);
	return lastUsed?.id ?? personalProjectId;
}

/**
 * Maps the user's projects to default-project candidates. Without the team-project licence
 * the user cannot work in team projects, so there is no candidate.
 */
export function toDefaultProjectCandidates(
	projects: ReadonlyArray<{ id: string; type: ProjectType; scopes?: Scope[] }>,
	teamProjectsEnabled: boolean,
): DefaultProjectCandidate[] {
	if (!teamProjectsEnabled) return [];
	return projects.map((project) => ({
		id: project.id,
		type: project.type,
		canCreateWorkflow: getResourcePermissions(project.scopes).workflow.create === true,
	}));
}
