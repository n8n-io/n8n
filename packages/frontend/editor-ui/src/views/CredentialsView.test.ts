import { createComponentRenderer } from '@/__tests__/render';
import { createTestProject } from '@/features/projects/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { useCredentialsStore } from '@/stores/credentials.store';
import CredentialsView from '@/views/CredentialsView.vue';
import { useUIStore } from '@/stores/ui.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor, within, fireEvent } from '@testing-library/vue';
import { STORES } from '@n8n/stores';
import { CREDENTIAL_SELECT_MODAL_KEY, VIEWS } from '@/constants';
import { useProjectsStore } from '@/features/projects/projects.store';
import { createRouter, createWebHistory } from 'vue-router';
import { flushPromises } from '@vue/test-utils';
import { CREDENTIAL_EMPTY_VALUE } from 'n8n-workflow';

vi.mock('@/composables/useGlobalEntityCreation', () => ({
	useGlobalEntityCreation: () => ({
		menu: [],
	}),
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
			path: '/:credentialId?',
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

describe('CredentialsView', () => {
	beforeEach(async () => {
		createTestingPinia({ initialState });
		await router.push('/');
		await router.isReady();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render credentials', () => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.allCredentials = [
			{
				id: '1',
				name: 'test',
				type: 'test',
				createdAt: '2021-05-05T00:00:00Z',
				updatedAt: '2021-05-05T00:00:00Z',
				isManaged: false,
			},
		];
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.isProjectHome = false;
		const { getByTestId } = renderComponent();
		expect(getByTestId('resources-list-item')).toBeVisible();
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
			expect(uiStore.openModal).toHaveBeenCalledWith(CREDENTIAL_SELECT_MODAL_KEY);
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
			expect(uiStore.openExistingCredential).toHaveBeenCalledWith('abc123');
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

			await fireEvent.click(getByTestId('credential-filter-setup-needed'));
			await waitFor(() => expect(getAllByTestId('resources-list-item').length).toBe(2));
		});
	});
});
