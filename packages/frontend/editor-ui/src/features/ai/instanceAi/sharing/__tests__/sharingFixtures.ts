import type { InstanceAiThreadSummary } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { useInstanceAiStore } from '../../instanceAi.store';

export const THREAD_ID = 'thread-1';
export const PROJECT_ID = 'project-1';
export const OWNER = { id: 'owner-1', name: 'Alice Owner' };
export const TEAMMATE = { id: 'teammate-1', name: 'Bob Teammate' };
export const READ_SCOPES: Scope[] = ['instanceAi:message', 'project:read'];
export const EDITOR_SCOPES: Scope[] = [
	...READ_SCOPES,
	'workflow:update',
	'workflow:execute',
	'workflow:delete',
	'workflow:publish',
];

export interface SharingSetup {
	viewerId?: string;
	/** The thread is shared with its project. */
	shared?: boolean;
	/** The viewer's scopes in the thread's project. */
	scopes?: Scope[];
	projectType?: 'team' | 'personal';
	projectName?: string;
	ownerName?: string;
	teamProjectsEnabled?: boolean;
	/** The project is not in the viewer's project list. */
	notMember?: boolean;
}

export function sharedThreadSummary(setup: SharingSetup = {}): InstanceAiThreadSummary {
	const projectName = setup.projectName ?? 'Marketing';
	return {
		id: THREAD_ID,
		title: 'Weekly digest',
		createdAt: '2026-10-01T09:30:00.000Z',
		updatedAt: '2026-10-01T09:30:00.000Z',
		...(setup.shared && {
			sharedWith: { projectId: PROJECT_ID, projectName },
			owner: { id: OWNER.id, name: setup.ownerName ?? OWNER.name },
		}),
	};
}

/** Fills the stores that the sharing view reads. Needs an active testing pinia. */
export function setUpSharing(setup: SharingSetup = {}) {
	useUsersStore().currentUserId = setup.viewerId ?? OWNER.id;

	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.isTeamProjectFeatureEnabled = setup.teamProjectsEnabled ?? true;
	projectsStore.myProjects = setup.notMember
		? []
		: [
				{
					id: PROJECT_ID,
					name: setup.projectName ?? 'Marketing',
					type: setup.projectType ?? 'team',
					role: 'project:editor',
					scopes: setup.scopes ?? EDITOR_SCOPES,
				} as ProjectListItem,
			];

	const instanceAiStore = useInstanceAiStore();
	instanceAiStore.threads = [sharedThreadSummary(setup)];
	return { projectsStore, instanceAiStore };
}
