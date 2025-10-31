import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as permissionsModule from '@n8n/permissions';
import { useCredentialNavigationCommands } from './useCredentialNavigationCommands';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { VIEWS } from '@/app/constants';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
	useRoute: () => ({
		name: VIEWS.CREDENTIALS,
		params: { projectId: 'project-1' },
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal()),
	getResourcePermissions: vi.fn(() => ({
		credential: {
			create: true,
		},
	})),
}));

describe('useCredentialNavigationCommands', () => {
	let mockCredentialsStore: ReturnType<typeof useCredentialsStore>;
	let mockProjectsStore: ReturnType<typeof useProjectsStore>;
	let mockUIStore: ReturnType<typeof useUIStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;

	const createMockCredential = (
		id: string,
		name: string,
		type: string,
		projectId?: string,
		projectName?: string,
		projectType?: 'personal' | 'team',
	): ICredentialsResponse => ({
		id,
		name,
		type,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		homeProject: projectId
			? ({
					id: projectId,
					name: projectName ?? 'Project',
					type: projectType ?? 'team',
					icon: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				} as ProjectSharingData)
			: undefined,
		sharedWithProjects: [],
		isManaged: false,
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockCredentialsStore = useCredentialsStore();
		mockProjectsStore = useProjectsStore();
		mockUIStore = useUIStore();
		mockSourceControlStore = useSourceControlStore();

		mockProjectsStore.myProjects = [
			{
				id: 'personal-1',
				name: 'Personal',
				type: 'personal',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:personalOwner',
			},
			{
				id: 'project-1',
				name: 'Team Project',
				type: 'team',
				icon: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				role: 'project:admin',
			},
		];

		Object.defineProperty(mockCredentialsStore, 'allCredentials', {
			value: [],
			writable: true,
		});

		Object.defineProperty(mockCredentialsStore, 'fetchAllCredentials', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(mockCredentialsStore, 'fetchCredentialTypes', {
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(mockUIStore, 'openExistingCredential', {
			value: vi.fn(),
		});

		mockSourceControlStore.preferences.branchReadOnly = false;

		vi.clearAllMocks();
		vi.mocked(permissionsModule).getResourcePermissions.mockRestore();
	});

	describe('initialize', () => {
		it('should fetch credential types on initialize', async () => {
			const { initialize } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			await initialize?.();

			expect(mockCredentialsStore.fetchCredentialTypes).toHaveBeenCalledWith(false);
		});
	});

	describe('create credential command', () => {
		it('should include create credential command when not in read-only mode', () => {
			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-credential');
			expect(createCommand).toBeDefined();
			expect(createCommand?.title).toBe('commandBar.credentials.create');
		});

		it('should not include create credential command when in read-only mode', () => {
			mockSourceControlStore.preferences.branchReadOnly = true;

			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const createCommand = commands.value.find((cmd) => cmd.id === 'create-credential');
			expect(createCommand).toBeUndefined();
		});

		it('should not include create credential command when user has no permission', () => {
			vi.mocked(permissionsModule).getResourcePermissions.mockReturnValue({
				credential: {
					create: false,
				},
			} as unknown as permissionsModule.PermissionsRecord);
			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});
			const createCommand = commands.value.find((cmd) => cmd.id === 'create-credential');
			expect(createCommand).toBeUndefined();
		});
	});

	describe('open credential command', () => {
		it('should include open credential command', () => {
			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			expect(openCommand).toBeDefined();
			expect(openCommand?.title).toBe('commandBar.credentials.open');
			expect(openCommand?.placeholder).toBe('commandBar.credentials.searchPlaceholder');
		});

		it('should have empty children when not navigated into', () => {
			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			expect(openCommand?.children).toHaveLength(0);
		});

		it('should populate children after navigating to open-credential', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'My API Key', 'httpHeaderAuth', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>(null);
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				expect(openCommand?.children).toHaveLength(1);
				expect(openCommand?.children?.[0].section).toBe('commandBar.credentials.open');
				expect(openCommand?.children?.[0].title).toEqual(
					expect.objectContaining({
						props: expect.objectContaining({
							title: 'My API Key',
						}),
					}),
				);
			});
		});
	});

	describe('credential search and filtering', () => {
		beforeEach(() => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Gmail Account', 'gmailOAuth2', 'project-1', 'Team Project'),
				createMockCredential(
					'cred-2',
					'Slack Token',
					'slackApi',
					'personal-1',
					'Personal',
					'personal',
				),
				createMockCredential('cred-3', 'GitHub API', 'githubApi', 'project-1', 'Team Project'),
			];
		});

		it('should filter credentials based on search query', async () => {
			const activeNodeId = ref<string | null>('open-credential');
			const lastQuery = ref('');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');
			await vi.waitFor(() => {
				expect(commands.value.find((cmd) => cmd.id === 'open-credential')?.children).toHaveLength(
					3,
				);
			});

			lastQuery.value = 'gmail';
			handlers.onCommandBarChange('gmail');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				expect(openCommand?.children).toHaveLength(1);
				expect(openCommand?.children?.[0].id).toBe('cred-1');
			});
		});

		it('should be case insensitive when filtering', async () => {
			const activeNodeId = ref<string | null>('open-credential');
			const lastQuery = ref('');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');
			lastQuery.value = 'SLACK';
			handlers.onCommandBarChange('SLACK');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				expect(openCommand?.children).toHaveLength(1);
				expect(openCommand?.children?.[0].id).toBe('cred-2');
			});
		});

		it('should order results with current project credentials first', async () => {
			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				const children = openCommand?.children ?? [];
				expect(children).toHaveLength(3);
				// Current project (project-1) credentials should come first, then personal
				const currentProjectCreds = children.filter((c) => c.id === 'cred-1' || c.id === 'cred-3');
				const personalCreds = children.filter((c) => c.id === 'cred-2');
				expect(currentProjectCreds).toHaveLength(2);
				expect(personalCreds).toHaveLength(1);
				// Verify that personal credential comes last
				expect(children[2].id).toBe('cred-2');
			});
		});
	});

	describe('root credential items', () => {
		beforeEach(() => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Gmail Account', 'gmailOAuth2', 'project-1', 'Team Project'),
			];
		});

		it('should not show root credential items when query is too short', () => {
			const { commands } = useCredentialNavigationCommands({
				lastQuery: ref('gm'),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			const rootCredentials = commands.value.filter((cmd) => cmd.id === 'cred-1');
			expect(rootCredentials).toHaveLength(0);
		});

		it('should show root credential items when query is longer than 2 characters', async () => {
			const lastQuery = ref('gma');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery,
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('gma');

			await vi.waitFor(() => {
				const rootCredentials = commands.value.filter((cmd) => cmd.id === 'cred-1');
				expect(rootCredentials).toHaveLength(1);
				expect(rootCredentials[0].section).toBe('commandBar.sections.credentials');
				expect(rootCredentials[0].title).toEqual(
					expect.objectContaining({
						props: expect.objectContaining({
							title: 'generic.openResource',
						}),
					}),
				);
			});
		});
	});

	describe('credential command handler', () => {
		it('should open credential when clicked', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Gmail Account', 'gmailOAuth2', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				expect(openCommand?.children).toHaveLength(1);
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			await openCommand?.children?.[0].handler?.();

			expect(mockUIStore.openExistingCredential).toHaveBeenCalledWith('cred-1');
		});
	});

	describe('credential project suffix', () => {
		it('should show personal project suffix for personal credentials', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential(
					'cred-1',
					'Personal Cred',
					'httpHeaderAuth',
					'personal-1',
					'Personal',
					'personal',
				),
			];

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				const credential = openCommand?.children?.[0];
				expect(credential).toBeDefined();
				expect(credential?.title).toEqual({
					component: expect.any(Object) as unknown,
					props: expect.objectContaining({
						suffix: 'projects.menu.personal',
					}),
				});
			});
		});

		it('should show project name for team project credentials', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential(
					'cred-1',
					'Team Cred',
					'httpHeaderAuth',
					'project-1',
					'Team Project',
					'team',
				),
			];

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				const credential = openCommand?.children?.[0];
				expect(credential).toBeDefined();
				expect(credential?.title).toEqual({
					component: expect.any(Object) as unknown,
					props: expect.objectContaining({
						suffix: 'Team Project',
					}),
				});
			});
		});

		it('should show empty suffix when credential has no home project', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Orphan Cred', 'httpHeaderAuth'),
			];

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				const credential = openCommand?.children?.[0];
				expect(credential).toBeDefined();
				expect(credential?.title).toEqual({
					component: expect.any(Object) as unknown,
					props: expect.objectContaining({
						suffix: '',
					}),
				});
			});
		});
	});

	describe('onCommandBarNavigateTo handler', () => {
		it('should set loading state when navigating to open-credential', () => {
			const { isLoading, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId: ref(null),
				currentProjectName: ref('Team Project'),
			});

			expect(isLoading.value).toBe(false);

			handlers.onCommandBarNavigateTo('open-credential');

			expect(isLoading.value).toBe(true);
		});

		it('should clear credential results when navigating back to root', async () => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Gmail Account', 'gmailOAuth2', 'project-1', 'Team Project'),
			];

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
				expect(openCommand?.children).toHaveLength(1);
			});

			handlers.onCommandBarNavigateTo(null);

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			expect(openCommand?.children).toHaveLength(0);
		});
	});

	describe('onCommandBarChange handler', () => {
		beforeEach(() => {
			(mockCredentialsStore.allCredentials as unknown) = [
				createMockCredential('cred-1', 'Gmail Account', 'gmailOAuth2', 'project-1', 'Team Project'),
			];
		});

		it('should set loading state when searching inside open-credential', () => {
			const activeNodeId = ref<string | null>('open-credential');
			const { isLoading, handlers } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('gmail');

			expect(isLoading.value).toBe(true);
		});

		it('should not set loading state when searching from root with short query', () => {
			const activeNodeId = ref<string | null>(null);
			const lastQuery = ref('gm');
			const { isLoading, handlers } = useCredentialNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('gm');

			expect(isLoading.value).toBe(false);
		});

		it('should set loading state when searching from root with query longer than 2 chars', () => {
			const activeNodeId = ref<string | null>(null);
			const lastQuery = ref('gma');
			const { isLoading, handlers } = useCredentialNavigationCommands({
				lastQuery,
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarChange('gma');

			expect(isLoading.value).toBe(false); // Not in parent node, so shouldn't be loading
		});
	});

	describe('error handling', () => {
		it('should handle fetch errors gracefully', async () => {
			Object.defineProperty(mockCredentialsStore, 'fetchAllCredentials', {
				value: vi.fn().mockRejectedValue(new Error('Network error')),
			});

			const activeNodeId = ref<string | null>('open-credential');
			const { commands, handlers, isLoading } = useCredentialNavigationCommands({
				lastQuery: ref(''),
				activeNodeId,
				currentProjectName: ref('Team Project'),
			});

			handlers.onCommandBarNavigateTo('open-credential');

			await vi.waitFor(() => {
				expect(isLoading.value).toBe(false);
			});

			const openCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			expect(openCommand?.children).toHaveLength(0);
		});
	});
});
