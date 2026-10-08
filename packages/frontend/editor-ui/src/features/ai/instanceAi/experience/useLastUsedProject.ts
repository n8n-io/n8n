import { z } from 'zod';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { chooseDefaultProject, toDefaultProjectCandidates } from './defaultProject';

const STORAGE_KEY_PREFIX = 'n8n:instance-ai:last-project:';

// The stored value comes from outside the app, so it is checked before use.
const storedProjectIdSchema = z.string().trim().min(1);

const storageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

function readProjectId(userId: string): string | undefined {
	try {
		const parsed = storedProjectIdSchema.safeParse(localStorage.getItem(storageKey(userId)));
		return parsed.success ? parsed.data : undefined;
	} catch {
		// Blocked storage: no project is remembered.
		return undefined;
	}
}

function writeProjectId(userId: string, projectId: string) {
	try {
		localStorage.setItem(storageKey(userId), projectId);
	} catch {
		// Blocked or full storage: Simple mode uses the personal project next time.
	}
}

/**
 * The team project in which the current user last started an Assistant chat, kept in this
 * browser for each user, and the project in which Simple mode starts new work.
 * Without a signed-in user, nothing is read or stored.
 */
export function useLastUsedProject() {
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	function lastUsedProjectId(): string | undefined {
		const userId = usersStore.currentUserId;
		return userId ? readProjectId(userId) : undefined;
	}

	/** Remembers the project of a chat that started. Other project types change nothing. */
	function rememberChatProject(projectId: string) {
		const userId = usersStore.currentUserId;
		const isTeamProject = projectsStore.myProjects.some(
			(project) => project.id === projectId && project.type === ProjectTypes.Team,
		);
		if (userId && isTeamProject) writeProjectId(userId, projectId);
	}

	/**
	 * The project for a new Simple-mode chat or workflow when the URL names no project.
	 * The rule reads the projects again on each call, so a lost role counts at once.
	 */
	function simpleDefaultProjectId(): string | undefined {
		return chooseDefaultProject({
			lastUsedProjectId: lastUsedProjectId(),
			projects: toDefaultProjectCandidates(
				projectsStore.myProjects,
				projectsStore.isTeamProjectFeatureEnabled,
			),
			personalProjectId: projectsStore.personalProject?.id,
		});
	}

	return { lastUsedProjectId, rememberChatProject, simpleDefaultProjectId };
}
