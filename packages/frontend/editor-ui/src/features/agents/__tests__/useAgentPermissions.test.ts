import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { Scope } from '@n8n/permissions';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { useAgentPermissions } from '../composables/useAgentPermissions';

const PROJECT_ID = 'project-1';

const makeProject = (scopes: Scope[]): ProjectListItem => ({
	id: PROJECT_ID,
	name: 'Team Alpha',
	icon: { type: 'icon', value: 'folder' },
	type: ProjectTypes.Team,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	role: 'project:editor',
	scopes,
});

describe('useAgentPermissions', () => {
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		projectsStore = mockedStore(useProjectsStore);
		usersStore = mockedStore(useUsersStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		projectsStore.myProjects = [];
		usersStore.currentUser = null;
		sourceControlStore.preferences = { branchReadOnly: false } as never;
	});

	it('grants permissions from project scopes when global scopes are absent', () => {
		projectsStore.myProjects = [
			makeProject([
				'agent:create',
				'agent:update',
				'agent:delete',
				'agent:publish',
				'agent:unpublish',
			]),
		];

		const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } =
			useAgentPermissions(PROJECT_ID);

		expect(canCreate.value).toBe(true);
		expect(canUpdate.value).toBe(true);
		expect(canDelete.value).toBe(true);
		expect(canPublish.value).toBe(true);
		expect(canUnpublish.value).toBe(true);
	});

	it('grants permissions from global scopes when no project is found', () => {
		usersStore.currentUser = {
			globalScopes: [
				'agent:create',
				'agent:update',
				'agent:delete',
				'agent:publish',
				'agent:unpublish',
			],
		} as never;

		const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } =
			useAgentPermissions(PROJECT_ID);

		expect(canCreate.value).toBe(true);
		expect(canUpdate.value).toBe(true);
		expect(canDelete.value).toBe(true);
		expect(canPublish.value).toBe(true);
		expect(canUnpublish.value).toBe(true);
	});

	it('grants permissions when either scope source allows the action', () => {
		projectsStore.myProjects = [makeProject(['agent:create', 'agent:update'])];
		usersStore.currentUser = {
			globalScopes: ['agent:delete'],
		} as never;

		const { canCreate, canUpdate, canDelete, canPublish } = useAgentPermissions(PROJECT_ID);

		expect(canCreate.value).toBe(true);
		expect(canUpdate.value).toBe(true);
		expect(canDelete.value).toBe(true);
		expect(canPublish.value).toBe(false);
	});

	it('returns false for every flag when no scopes match', () => {
		projectsStore.myProjects = [makeProject([])];
		usersStore.currentUser = { globalScopes: [] } as never;

		const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } =
			useAgentPermissions(PROJECT_ID);

		expect(canCreate.value).toBe(false);
		expect(canUpdate.value).toBe(false);
		expect(canDelete.value).toBe(false);
		expect(canPublish.value).toBe(false);
		expect(canUnpublish.value).toBe(false);
	});

	it('blocks every flag when source control puts the branch in read-only mode', () => {
		projectsStore.myProjects = [
			makeProject([
				'agent:create',
				'agent:update',
				'agent:delete',
				'agent:publish',
				'agent:unpublish',
			]),
		];
		usersStore.currentUser = {
			globalScopes: [
				'agent:create',
				'agent:update',
				'agent:delete',
				'agent:publish',
				'agent:unpublish',
			],
		} as never;
		sourceControlStore.preferences = { branchReadOnly: true } as never;

		const { canCreate, canUpdate, canDelete, canPublish, canUnpublish } =
			useAgentPermissions(PROJECT_ID);

		expect(canCreate.value).toBe(false);
		expect(canUpdate.value).toBe(false);
		expect(canDelete.value).toBe(false);
		expect(canPublish.value).toBe(false);
		expect(canUnpublish.value).toBe(false);
	});
});
