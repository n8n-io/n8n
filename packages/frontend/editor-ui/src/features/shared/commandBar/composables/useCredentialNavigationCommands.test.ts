import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCredentialNavigationCommands } from './useCredentialNavigationCommands';
import { searchCredentials } from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import {
	createProjectListItem,
	createProjectSharingData,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';
import { VIEWS } from '@/app/constants';

const routerPushMock = vi.fn();
const routerResolveMock = vi.fn(() => ({ href: '/resolved-href' }));
const mockRoute: { name: string; params: Record<string, string> } = { name: '', params: {} };

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		resolve: routerResolveMock,
	}),
	useRoute: () => mockRoute,
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(' '),
	}),
}));

vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal()),
	searchCredentials: vi.fn(),
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: { name: 'CredentialIcon' },
}));

const createCredential = (overrides: Partial<ICredentialsResponse> = {}): ICredentialsResponse => ({
	id: 'cred-1',
	name: 'Gmail Account',
	type: 'gmailOAuth2',
	data: '',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
	homeProject: { ...createProjectSharingData('team'), id: 'project-1', name: 'Team Project' },
	sharedWithProjects: [],
	isManaged: false,
	...overrides,
});

describe('useCredentialNavigationCommands', () => {
	let projectsStore: ReturnType<typeof useProjectsStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;

	const setup = () => useCredentialNavigationCommands({ currentProjectName: ref('Team Project') });

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();

		projectsStore = useProjectsStore();
		sourceControlStore = useSourceControlStore();

		mockRoute.name = VIEWS.PROJECTS_WORKFLOWS;
		mockRoute.params = { projectId: 'project-1' };

		projectsStore.myProjects = [
			{ ...createProjectListItem('personal'), id: 'personal-1' },
			{ ...createProjectListItem('team'), id: 'project-1' },
		];
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['credential:create'],
		});
		sourceControlStore.preferences.branchReadOnly = false;
	});

	describe('source', () => {
		it('exposes an always available remote credentials source', () => {
			const { source } = setup();

			expect(source).toMatchObject({
				id: 'credentials',
				title: 'commandBar.sections.credentials',
				isRemote: true,
			});
			expect(source?.isAvailable()).toBe(true);
		});

		it('searches credentials by trimmed name and requests one extra row', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([]);

			await setup().source?.search({ query: '  gmail ', offset: 20, limit: 10 });

			expect(searchCredentials).toHaveBeenCalledWith(useRootStore().restApiContext, {
				name: 'gmail',
				skip: 20,
				take: 11,
			});
		});

		it('reports more results and drops the extra row when the response exceeds the limit', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([
				createCredential({ id: 'cred-1' }),
				createCredential({ id: 'cred-2' }),
				createCredential({ id: 'cred-3' }),
			]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 2 });

			expect(result?.items.map((item) => item.id)).toEqual(['cred-1', 'cred-2']);
			expect(result?.hasMore).toBe(true);
		});

		it('reports no more results when the response fits within the limit', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([
				createCredential({ id: 'cred-1' }),
				createCredential({ id: 'cred-2' }),
			]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 2 });

			expect(result?.items).toHaveLength(2);
			expect(result?.hasMore).toBe(false);
		});

		it('maps a team project credential to a command bar item', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([createCredential()]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0]).toMatchObject({
				id: 'cred-1',
				title: 'Gmail Account',
				description: 'Team Project',
				icon: { component: CredentialIcon, props: { credentialTypeName: 'gmailOAuth2' } },
				timestamp: '2026-01-02T00:00:00.000Z',
				href: '/resolved-href',
			});
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: 'project-1', credentialId: 'cred-1' },
			});
		});

		it('uses the personal label as description for a personal project credential', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([
				createCredential({
					homeProject: { ...createProjectSharingData('personal'), name: 'Jane Doe' },
				}),
			]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0].description).toBe('projects.menu.personal');
		});

		it('links to the credentials route when the credential has no home project', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([
				createCredential({ homeProject: undefined }),
			]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });

			expect(result?.items[0].description).toBe('');
			expect(routerResolveMock).toHaveBeenCalledWith({
				name: VIEWS.CREDENTIALS,
				params: { credentialId: 'cred-1' },
			});
		});

		it('opens the credential modal when the item handler runs', async () => {
			vi.mocked(searchCredentials).mockResolvedValue([createCredential()]);

			const result = await setup().source?.search({ query: '', offset: 0, limit: 10 });
			await result?.items[0].handler?.();

			expect(useUIStore().openExistingCredential).toHaveBeenCalledWith('cred-1');
		});
	});

	describe('create credential command', () => {
		const findCreateCommand = () =>
			setup().commands.value.find((command) => command.id === 'create-credential');

		it('shows the create command for the current project when the user can create credentials', () => {
			expect(findCreateCommand()).toMatchObject({
				title: 'commandBar.credentials.create Team Project',
				section: 'commandBar.sections.credentials',
			});
		});

		it('hides the create command in a read-only environment', () => {
			sourceControlStore.preferences.branchReadOnly = true;

			expect(findCreateCommand()).toBeUndefined();
		});

		it('hides the create command when the project does not allow credential creation', () => {
			projectsStore.currentProject = createTestProject({ id: 'project-1', scopes: [] });

			expect(findCreateCommand()).toBeUndefined();
		});

		it('uses the personal project permissions when there is no current project', () => {
			projectsStore.currentProject = null;
			projectsStore.personalProject = createTestProject({
				id: 'personal-1',
				type: 'personal',
				scopes: ['credential:create'],
			});

			expect(findCreateCommand()).toBeDefined();
		});

		it.each([
			{ routeName: VIEWS.SHARED_CREDENTIALS, expectedRouteName: VIEWS.SHARED_CREDENTIALS },
			{ routeName: VIEWS.CREDENTIALS, expectedRouteName: VIEWS.CREDENTIALS },
			{ routeName: VIEWS.PROJECTS_WORKFLOWS, expectedRouteName: VIEWS.PROJECTS_CREDENTIALS },
		])(
			'opens the create modal on $expectedRouteName from $routeName',
			async ({ routeName, expectedRouteName }) => {
				mockRoute.name = routeName;

				await findCreateCommand()?.handler?.();

				expect(routerPushMock).toHaveBeenCalledWith({
					name: expectedRouteName,
					params: { projectId: 'project-1', credentialId: 'create' },
				});
			},
		);

		it('opens the create modal in the personal project when the route has no project', async () => {
			mockRoute.params = {};

			await findCreateCommand()?.handler?.();

			expect(routerPushMock).toHaveBeenCalledWith({
				name: VIEWS.PROJECTS_CREDENTIALS,
				params: { projectId: 'personal-1', credentialId: 'create' },
			});
		});
	});

	describe('initialize', () => {
		it('loads credential types without a forced refresh', async () => {
			await setup().initialize?.();

			expect(useCredentialsStore().fetchCredentialTypes).toHaveBeenCalledWith(false);
		});
	});
});
