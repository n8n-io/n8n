import { usePostHog } from '@/app/stores/posthog.store';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '../credentials.store';
import type { CredentialRestriction } from '@n8n/api-types';
import type { ICredentialsResponse } from '../credentials.types';
import CredentialsView from './CredentialsView.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor, within, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { STORES } from '@n8n/stores';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createRouter, createWebHistory } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';
import * as projectsApi from '@/features/collaboration/projects/projects.api';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

const mockAuthorize = vi.fn();
const mockIsOAuthCredentialType = vi.fn(() => true);

vi.mock('../composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => ({
		authorize: mockAuthorize,
		isOAuthCredentialType: mockIsOAuthCredentialType,
	}),
}));

vi.mock('@/app/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
}));

vi.mock('@/features/collaboration/projects/projects.api', () => ({
	getProject: vi.fn(),
}));

vi.mock('@/app/api/workflow-dependencies', () => ({
	getResourceDependencyCounts: vi.fn().mockResolvedValue({}),
	getResourceDependencies: vi.fn().mockResolvedValue({}),
}));

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			name: VIEWS.HOMEPAGE,
			path: '/',
			component: { template: '<div></div>' },
		},
		{
			path: '/:projectId?/credentials/:credentialId?',
			name: VIEWS.CREDENTIALS,
			component: { template: '<div></div>' },
		},
		{
			path: '/entity-un-authorized',
			name: VIEWS.ENTITY_UNAUTHORIZED,
			component: { template: '<div></div>' },
		},
		{
			path: '/entity-not-found',
			name: VIEWS.ENTITY_NOT_FOUND,
			component: { template: '<div></div>' },
		},
	],
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: { enterprise: { variables: true, projects: { team: { limit: -1 } } } },
	},
};

const renderComponent = createComponentRenderer(CredentialsView, {
	global: { stubs: { ProjectHeader: true }, plugins: [router] },
});

const mockedProjectsApi = vi.mocked(projectsApi);

describe('CredentialsView', () => {
	beforeEach(async () => {
		createTestingPinia({ initialState });
		mockedStore(usePostHog).isFeatureEnabled.mockReturnValue(true);
		await router.push('/');
		await router.isReady();

		// Mock getProject to prevent actual API calls when routes with projectId are navigated to
		mockedProjectsApi.getProject.mockResolvedValue(createTestProject({}));
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockAuthorize.mockReset();
	});

	const enableDynamicCredentials = () => {
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings = {
			...settingsStore.settings,
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
			},
			activeModules: ['dynamic-credentials'],
		} as unknown as typeof settingsStore.settings;
		settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
	};

	it('should render credentials', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.allCredentials = [
			{
				id: '1',
				name: 'test',
				type: 'test',
				description: 'Use for production reports',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				isManaged: false,
			},
		];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = false;
		const { getByTestId } = renderComponent();
		expect(getByTestId('resources-list-item')).toBeVisible();
		expect(getByTestId('credential-card-description')).toHaveTextContent(
			'Use for production reports',
		);
	});

	it('should disable cards based on permissions', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.allCredentials = [
			{
				id: '1',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				scopes: ['credential:update'],
				isManaged: false,
			},
			{
				id: '2',
				name: 'test2',
				type: 'test2',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				isManaged: false,
			},
		];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = false;
		const { getAllByTestId } = renderComponent();

		const items = getAllByTestId('resources-list-item');
		expect(items.length).toBe(2);

		expect(within(items[1]).getByText('Read only')).toBeInTheDocument();
	});

	describe('create credential', () => {
		it('should show the modal on the route if the user has the scope to create credentials in the project.', async () => {
			const uiStore = mockedStore(useUIStore);
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = createTestProject({ scopes: ['credential:create'] });
			const { rerender } = renderComponent();
			await rerender({ credentialId: 'create' });
			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: CREDENTIAL_SELECT_MODAL_KEY,
				data: {},
			});
		});

		it('loads the policy of the project that a new credential goes to', async () => {
			await router.push('/team-1/credentials');
			const policies = mockedStore(useTypeAvailabilityPoliciesStore);

			renderComponent();

			expect(policies.fetchForProject).toHaveBeenCalledWith('team-1');
		});

		it('should not show the modal on the route if the user has no scope to create credential in the project', async () => {
			const uiStore = mockedStore(useUIStore);
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.currentProject = createTestProject({ scopes: ['credential:read'] });
			const { rerender } = renderComponent();
			await rerender({ credentialId: 'create' });
			expect(uiStore.openModal).not.toHaveBeenCalled();
		});
	});

	describe('open existing credential', () => {
		it('should show the modal on the route if the user has permission to read or update', async () => {
			const uiStore = mockedStore(useUIStore);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockImplementation(() => ({
				id: 'abc123',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				scopes: ['credential:read'],
			}));
			const { rerender } = renderComponent();
			await rerender({ credentialId: 'abc123' });
			expect(uiStore.openExistingCredential).toHaveBeenCalledWith('abc123', expect.anything());
		});

		it('should not show the modal on the route if the user has no permission to read or update', async () => {
			const uiStore = mockedStore(useUIStore);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.getCredentialById = vi.fn().mockImplementation(() => ({
				id: 'abc123',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				scopes: ['credential:list'],
			}));
			const { rerender } = renderComponent();
			await rerender({ credentialId: 'abc123' });
			expect(uiStore.openExistingCredential).not.toHaveBeenCalled();
		});

		it('should update credentialId route param when opened', async () => {
			const replaceSpy = vi.spyOn(router, 'replace');
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.isProjectHome = false;
			projectsStore.currentProject = createTestProject({ scopes: ['credential:read'] });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
				},
			];
			const { getByTestId } = renderComponent();

			/**
			 * userEvent DOES NOT work here
			 */
			await fireEvent.click(getByTestId('resources-list-item'));
			await waitFor(() =>
				expect(replaceSpy).toHaveBeenCalledWith(
					expect.objectContaining({ params: { credentialId: '1' } }),
				),
			);
		});
	});

	it("should redirect to unauthorized page if user doesn't have read or update permissions", async () => {
		const replaceSpy = vi.spyOn(router, 'replace');
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = vi.fn().mockImplementation(() => ({
			id: 'abc123',
			name: 'test',
			type: 'test',
			createdAt: '2021-05-05T00:00:00Z',
			updatedAt: '2021-05-05T00:00:00Z',
			scopes: [],
		}));
		const { rerender } = renderComponent();
		await rerender({ credentialId: 'abc123' });
		expect(replaceSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: VIEWS.ENTITY_UNAUTHORIZED,
				params: { entityType: 'credential' },
			}),
		);
	});

	it("should redirect to not found page if the credential doesn't exist", async () => {
		const replaceSpy = vi.spyOn(router, 'replace');
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.getCredentialById = vi.fn().mockImplementation(() => undefined);
		const { rerender } = renderComponent();
		await rerender({ credentialId: 'abc123' });
		expect(replaceSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				name: VIEWS.ENTITY_NOT_FOUND,
				params: { entityType: 'credential' },
			}),
		);
	});

	describe('filters', () => {
		it('should filter by type', async () => {
			await router.push({ name: VIEWS.CREDENTIALS, query: { type: ['test'] } });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentialTypes = [
				{
					name: 'test',
					displayName: 'test',
					properties: [],
				},
			];
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
				},
				{
					id: '1',
					name: 'test',
					type: 'another',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
				},
			];
			const { getAllByTestId } = renderComponent();
			expect(getAllByTestId('resources-list-item').length).toBe(1);
		});

		it('should filter by setupNeeded', async () => {
			await router.push({ name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'test',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: {} as unknown as string,
				},
				{
					id: '1',
					name: 'test',
					type: 'another',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: { anyKey: 'any' } as unknown as string,
				},
			];
			const { getAllByTestId, getByTestId } = renderComponent();
			await flushPromises();
			expect(getAllByTestId('resources-list-item').length).toBe(1);

			// Open filter popover first
			await fireEvent.click(getByTestId('resources-list-filters-trigger'));
			await fireEvent.click(getByTestId('credential-filter-setup-needed'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});

		it('should filter by setupNeeded when object keys are empty', async () => {
			await router.push({ name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'credential needs setup',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: { anyKey: '' } as unknown as string,
				},
				{
					id: '2',
					name: 'random',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: { anyKey: 'any value' } as unknown as string,
				},
			];
			const { getAllByTestId, getByTestId } = renderComponent();
			await flushPromises();
			expect(getAllByTestId('resources-list-item').length).toBe(1);
			expect(getByTestId('resources-list-item').textContent).toContain('credential needs setup');

			// Open filter popover first
			await fireEvent.click(getByTestId('resources-list-filters-trigger'));
			await fireEvent.click(getByTestId('credential-filter-setup-needed'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});

		it('should filter by setupNeeded when object keys are "CREDENTIAL_EMPTY_VALUE"', async () => {
			await router.push({ name: VIEWS.CREDENTIALS, query: { setupNeeded: 'true' } });
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				{
					id: '1',
					name: 'credential needs setup',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: { anyKey: CREDENTIAL_EMPTY_VALUE } as unknown as string,
				},
				{
					id: '2',
					name: 'random',
					type: 'test',
					createdAt: '2021-05-05T00:00:00Z',
					updatedAt: '2021-05-05T00:00:00Z',
					scopes: ['credential:update'],
					isManaged: false,
					data: { anyKey: 'any value' } as unknown as string,
				},
			];
			const { getAllByTestId, getByTestId } = renderComponent();
			await flushPromises();
			expect(getAllByTestId('resources-list-item').length).toBe(1);
			expect(getByTestId('resources-list-item').textContent).toContain('credential needs setup');

			// Open filter popover first
			await fireEvent.click(getByTestId('resources-list-filters-trigger'));
			await fireEvent.click(getByTestId('credential-filter-setup-needed'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});
	});

	describe('credentials shared with all users and projects', () => {
		it('requests global credentials for the personal project page', async () => {
			const personalProject = createTestProject({
				id: 'personal-project-id',
				type: ProjectTypes.Personal,
			});
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.personalProject = personalProject;
			projectsStore.currentProject = personalProject;

			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.fetchAllCredentials.mockClear();

			await router.push({
				name: VIEWS.CREDENTIALS,
				params: { projectId: personalProject.id },
			});
			renderComponent();
			await flushPromises();

			expect(credentialsStore.fetchAllCredentials).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: personalProject.id,
					includeGlobal: true,
				}),
			);
		});
	});

	describe('private credentials connect flow', () => {
		const buildPrivateUnconnectedCredential = (
			overrides: Partial<ICredentialsResponse> = {},
		): ICredentialsResponse =>
			({
				id: 'cred-1',
				name: 'Private OAuth cred',
				type: 'oAuth2Api',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				scopes: ['credential:connect'],
				isManaged: false,
				isResolvable: true,
				connectedByMe: false,
				...overrides,
			}) as ICredentialsResponse;

		it('maps connectedByMe and isResolvable to the credential card', () => {
			enableDynamicCredentials();
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [buildPrivateUnconnectedCredential()];

			const { getByTestId } = renderComponent();

			expect(getByTestId('credential-card-connect')).toBeInTheDocument();
			expect(getByTestId('card-badge')).toBeInTheDocument();
		});

		it('shows no connect prompt or connected label for connected private credentials', () => {
			enableDynamicCredentials();
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				buildPrivateUnconnectedCredential({ connectedByMe: true }),
			];

			const { getByTestId, queryByTestId } = renderComponent();

			expect(queryByTestId('credential-card-connect')).not.toBeInTheDocument();
			expect(queryByTestId('credential-card-connected')).not.toBeInTheDocument();
			expect(getByTestId('card-badge')).toBeInTheDocument();
		});

		it('does not show the "Needs first setup" badge for private credentials with empty data', () => {
			enableDynamicCredentials();
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = [
				buildPrivateUnconnectedCredential({
					connectedByMe: true,
					data: {} as unknown as string,
				}),
			];

			const { getByTestId } = renderComponent();

			expect(getByTestId('resources-list-item').textContent).not.toContain('Needs first setup');
		});

		it('refetches credentials when the Connect button completes successfully', async () => {
			enableDynamicCredentials();
			const credentialsStore = mockedStore(useCredentialsStore);
			const credential = buildPrivateUnconnectedCredential();
			credentialsStore.allCredentials = [credential];
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(true);

			const { getByTestId } = renderComponent();
			await flushPromises();
			credentialsStore.fetchAllCredentials.mockClear();

			await userEvent.click(getByTestId('credential-card-connect'));
			await flushPromises();

			expect(mockAuthorize).toHaveBeenCalledWith(credential);
			expect(credentialsStore.fetchAllCredentials).toHaveBeenCalled();
		});

		it('does not refetch credentials when the Connect flow is cancelled or fails', async () => {
			enableDynamicCredentials();
			const credentialsStore = mockedStore(useCredentialsStore);
			const credential = buildPrivateUnconnectedCredential();
			credentialsStore.allCredentials = [credential];
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(credential);
			mockAuthorize.mockResolvedValue(false);

			const { getByTestId } = renderComponent();
			await flushPromises();
			credentialsStore.fetchAllCredentials.mockClear();

			await userEvent.click(getByTestId('credential-card-connect'));
			await flushPromises();

			expect(mockAuthorize).toHaveBeenCalled();
			expect(credentialsStore.fetchAllCredentials).not.toHaveBeenCalled();
		});
	});

	describe('restricted credentials', () => {
		const typeRestricted = {
			reason: 'typeRestricted' as const,
			restriction: { name: 'slackApi', available: false, scope: 'project' as const },
		};
		const nodesRestricted = {
			reason: 'nodesRestricted' as const,
			restriction: { name: 'n8n-nodes-base.jira', available: false, scope: 'instance' as const },
			nodeTypes: ['n8n-nodes-base.jira'],
		};

		const credential = (
			id: string,
			type: string,
			restriction?: CredentialRestriction,
			overrides: Partial<ICredentialsResponse> = {},
		): ICredentialsResponse => ({
			id,
			name: `${type} credential`,
			type,
			createdAt: '2021-05-05T00:00:00Z',
			updatedAt: '2021-05-05T00:00:00Z',
			scopes: ['credential:update'],
			isManaged: false,
			homeProject: {
				id: 'team-1',
				name: 'team-1',
				icon: null,
				type: ProjectTypes.Team,
				createdAt: '',
				updatedAt: '',
			},
			...(restriction ? { restriction } : {}),
			...overrides,
		});

		const setup = ({
			enabled = true,
			credentials = [credential('1', 'slackApi', typeRestricted), credential('2', 'gmailOAuth2')],
		}: { enabled?: boolean; credentials?: ICredentialsResponse[] } = {}) => {
			const policies = mockedStore(useTypeAvailabilityPoliciesStore);
			policies.isEnabled = enabled;
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.allCredentials = credentials;
			credentialsStore.restrictionsById = Object.fromEntries(
				credentials.flatMap(({ id, restriction }) => (restriction ? [[id, restriction]] : [])),
			);
			return credentialsStore;
		};

		it.each([true, false])(
			'asks the server for restrictions only when the policies module is on (%s)',
			async (enabled) => {
				const credentialsStore = setup({ enabled });

				renderComponent();
				await flushPromises();

				expect(credentialsStore.fetchAllCredentials).toHaveBeenCalledWith(
					expect.objectContaining({ includeRestrictions: enabled }),
				);
			},
		);

		it('marks a credential that the server restricts, on Overview too', async () => {
			setup();

			const { getAllByTestId } = renderComponent();

			const [slack, gmail] = getAllByTestId('resources-list-item');
			expect(within(slack).getByTestId('credential-card-restricted')).toHaveTextContent(
				'Restricted',
			);
			expect(within(gmail).queryByTestId('credential-card-restricted')).not.toBeInTheDocument();
		});

		it('marks nothing when the policies module is off', async () => {
			setup({ enabled: false });

			const { queryByTestId, getByTestId, findByTestId } = renderComponent();
			await flushPromises();
			await fireEvent.click(getByTestId('resources-list-filters-trigger'));

			expect(await findByTestId('credential-filter-setup-needed')).toBeInTheDocument();
			expect(queryByTestId('credential-card-restricted')).not.toBeInTheDocument();
			expect(queryByTestId('credential-filter-cannot-be-used')).not.toBeInTheDocument();
		});

		it('filters on the credentials that cannot be used and keeps the filter in the URL', async () => {
			await router.push('/team-1/credentials');
			setup();

			const { getAllByTestId, getByTestId } = renderComponent();
			await flushPromises();
			expect(getAllByTestId('resources-list-item')).toHaveLength(2);

			await fireEvent.click(getByTestId('resources-list-filters-trigger'));
			await fireEvent.click(getByTestId('credential-filter-cannot-be-used-all'));

			await waitFor(() => expect(getAllByTestId('resources-list-item')).toHaveLength(1));
			expect(getByTestId('resources-list-item')).toHaveTextContent('slackApi credential');
			await waitFor(() =>
				expect(router.currentRoute.value.query.cannotBeUsed).toBe('typeRestricted,nodesRestricted'),
			);
		});

		it('restores the filter from the URL and matches only the selected reason', async () => {
			await router.push({
				path: '/team-1/credentials',
				query: { cannotBeUsed: 'nodesRestricted,unknown' },
			});
			setup();

			const { queryAllByTestId } = renderComponent();
			await flushPromises();

			expect(queryAllByTestId('resources-list-item')).toHaveLength(0);
		});

		it('marks a restricted credential that has no home project', async () => {
			setup({
				credentials: [credential('1', 'slackApi', typeRestricted, { homeProject: undefined })],
			});

			const { getByTestId } = renderComponent();
			await flushPromises();

			expect(getByTestId('credential-card-restricted')).toHaveTextContent('Restricted');
		});

		it('marks credentials on Overview before the personal project loads, and loads its policy after', async () => {
			const projectsStore = mockedStore(useProjectsStore);
			projectsStore.personalProject = null;
			setup();
			const policies = mockedStore(useTypeAvailabilityPoliciesStore);

			const { getAllByTestId } = renderComponent();
			await flushPromises();

			expect(getAllByTestId('credential-card-restricted')).toHaveLength(1);
			expect(policies.fetchForProject).not.toHaveBeenCalled();

			projectsStore.personalProject = createTestProject({ id: 'personal-1' });
			await flushPromises();

			expect(policies.fetchForProject).toHaveBeenCalledWith('personal-1');
		});

		it('filters on restricted nodes only', async () => {
			await router.push('/team-1/credentials');
			setup({
				credentials: [
					credential('1', 'slackApi', typeRestricted),
					credential('2', 'jiraSoftwareCloudApi', nodesRestricted),
					credential('3', 'gmailOAuth2'),
				],
			});

			const { getAllByTestId, getByTestId } = renderComponent();
			await flushPromises();
			expect(getAllByTestId('resources-list-item')).toHaveLength(3);

			await fireEvent.click(getByTestId('resources-list-filters-trigger'));
			await fireEvent.click(getByTestId('credential-filter-cannot-be-used-nodesRestricted'));

			await waitFor(() => expect(getAllByTestId('resources-list-item')).toHaveLength(1));
			expect(getByTestId('resources-list-item')).toHaveTextContent(
				'jiraSoftwareCloudApi credential',
			);
			expect(getByTestId('credential-card-restricted')).toHaveTextContent('Restricted');
			await waitFor(() =>
				expect(router.currentRoute.value.query.cannotBeUsed).toBe('nodesRestricted'),
			);
		});

		it('ignores a filter kept in the URL when the policies module is off', async () => {
			await router.push({
				path: '/team-1/credentials',
				query: { cannotBeUsed: 'typeRestricted' },
			});
			setup({ enabled: false });

			const { getAllByTestId } = renderComponent();
			await flushPromises();

			expect(getAllByTestId('resources-list-item')).toHaveLength(2);
		});
	});
});
