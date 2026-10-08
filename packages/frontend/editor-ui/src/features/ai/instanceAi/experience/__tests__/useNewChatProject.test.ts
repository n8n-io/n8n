import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import type { ExperienceMode } from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';
import {
	configureInstanceAi,
	stubLocalStorage,
} from '../../navigation/__tests__/navigationFixtures';
import { resetExperienceModeState } from '../useExperienceMode';
import { useNewChatProject } from '../useNewChatProject';

const routeQuery = reactive<Record<string, string | undefined>>({});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => ({ query: routeQuery }),
}));

const PERSONAL = 'personal-1';
const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
const LAST_PROJECT_KEY = 'n8n:instance-ai:last-project:user-1';

const storage = new Map<string, string>();
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let scope = effectScope();

function useMode(mode: ExperienceMode | 'flag-off') {
	configureInstanceAi(
		mode === 'flag-off' ? { experienceModes: false } : { experienceModes: true, defaultMode: mode },
	);
}

function myProjects(teamScopes: Record<string, string[]>) {
	return [
		{ id: PERSONAL, type: 'personal', name: 'Me', scopes: ['workflow:create'] },
		...Object.entries(teamScopes).map(([id, scopes]) => ({ id, type: 'team', name: id, scopes })),
	] as ProjectListItem[];
}

function start() {
	const result = scope.run(useNewChatProject);
	if (!result) throw new Error('The effect scope is not active');
	return result;
}

describe('useNewChatProject', () => {
	beforeEach(() => {
		for (const key of Object.keys(routeQuery)) delete routeQuery[key];
		storage.clear();
		stubLocalStorage(storage);
		createTestingPinia();
		resetExperienceModeState();
		useUsersStore().currentUserId = 'user-1';
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.isTeamProjectFeatureEnabled = true;
		projectsStore.personalProject = { id: PERSONAL } as Project;
		projectsStore.myProjects = myProjects({
			[TEAM_A]: ['workflow:create'],
			[TEAM_B]: ['workflow:create'],
		});
		storage.set(LAST_PROJECT_KEY, TEAM_A);
		scope = effectScope();
	});

	afterEach(() => {
		scope.stop();
		vi.unstubAllGlobals();
	});

	describe('in Power mode', () => {
		beforeEach(() => useMode('power'));

		it('starts in the personal project and offers the picker', () => {
			const { selectedProject, canSelectProject } = start();

			expect(selectedProject.value).toBe(PERSONAL);
			expect(canSelectProject.value).toBe(true);
		});

		it('keeps the project that the user picked when the projects load again', async () => {
			const { selectedProject } = start();
			selectedProject.value = TEAM_B;

			projectsStore.myProjects = myProjects({ [TEAM_A]: ['workflow:read'], [TEAM_B]: [] });
			await nextTick();

			expect(selectedProject.value).toBe(TEAM_B);
		});

		it('goes back to the personal project when ?projectId= is cleared', async () => {
			routeQuery.projectId = TEAM_B;
			const { selectedProject } = start();
			expect(selectedProject.value).toBe(TEAM_B);

			routeQuery.projectId = undefined;
			await nextTick();

			expect(selectedProject.value).toBe(PERSONAL);
		});

		it.each([
			['team projects are not licensed', false, 3],
			['the user has only the personal project', true, 1],
		])('offers no picker when %s', (_case, licensed, projectCount) => {
			projectsStore.isTeamProjectFeatureEnabled = licensed;
			projectsStore.myProjects = projectsStore.myProjects.slice(0, projectCount);

			expect(start().canSelectProject.value).toBe(false);
		});
	});

	describe('in Simple mode', () => {
		beforeEach(() => useMode('simple'));

		it('starts in the last-used team project and offers no picker', () => {
			const { selectedProject, canSelectProject } = start();

			expect(selectedProject.value).toBe(TEAM_A);
			expect(canSelectProject.value).toBe(false);
		});

		it('follows a chat that started in another team project', async () => {
			const { selectedProject, rememberChatProject } = start();

			rememberChatProject(TEAM_B);
			await nextTick();

			expect(selectedProject.value).toBe(TEAM_B);
		});

		it('keeps the project of ?projectId= when the projects change', async () => {
			routeQuery.projectId = TEAM_B;
			const { selectedProject } = start();

			projectsStore.myProjects = myProjects({ [TEAM_A]: ['workflow:read'] });
			await nextTick();

			expect(selectedProject.value).toBe(TEAM_B);
		});
	});

	it('chooses again on each mode switch', async () => {
		useMode('power');
		const { selectedProject } = start();
		expect(selectedProject.value).toBe(PERSONAL);

		useMode('simple');
		await nextTick();
		expect(selectedProject.value).toBe(TEAM_A);

		useMode('flag-off');
		await nextTick();
		expect(selectedProject.value).toBe(PERSONAL);
	});
});
