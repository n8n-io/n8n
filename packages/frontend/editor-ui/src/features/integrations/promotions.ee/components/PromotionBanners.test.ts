import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createServer, Response } from 'miragejs';
import { mock } from 'vitest-mock-extended';
import { createRouter, createWebHistory } from 'vue-router';
import type { IUser } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import PromotionBanners from './PromotionBanners.vue';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import { promotionEventBus } from '../promotions.eventBus';
import * as settingsApi from '../promotionsSettings.api';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/:projectId?', component: { template: '<div></div>' } },
		{ path: '/home/workflows', name: VIEWS.HOMEPAGE, component: { template: '<div></div>' } },
	],
});

const renderComponent = createComponentRenderer(PromotionBanners, {
	global: { plugins: [router] },
});

const commitSha = 'a'.repeat(40);

const oneChange = (name: string, status: string) => ({
	data: { commitSha, changes: [{ id: 'workflow-1', name, type: 'workflow', status }] },
});

const connections = (configs: Record<string, unknown>) => ({
	data: [{ id: 'connection-1', scope: 'instance', configs }],
	nextCursor: null,
});

describe('PromotionBanners', () => {
	let server: ReturnType<typeof createServer>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	beforeEach(async () => {
		await router.push('/project-1');
		await router.isReady();
		createTestingPinia();
		server = createServer({ environment: 'test' });
		projectsStore = mockedStore(useProjectsStore);
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);
		uiStore = mockedStore(useUIStore);

		settingsStore.isModuleActive.mockReturnValue(true);
		settingsStore.settings = {
			...settingsStore.settings,
			envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: 'true' },
		};
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['project:export'],
		});
		// The store reads this from the route, which the mocked store cannot see.
		projectsStore.currentProjectId = 'project-1';
		// The connection is cached per page load; tests must not share it.
		invalidateInstancePromotionConnection();
	});

	afterEach(() => {
		server.shutdown();
		vi.clearAllMocks();
	});

	it('shows outgoing changes only with export and push access', async () => {
		server.get('/api/v1/promotions/connections', () =>
			connections({ promote: { id: 'config-1' } }),
		);
		server.get('/rest/promotions/project-1/changes/promote', () =>
			oneChange('Changed workflow', 'modified'),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:push'],
		});
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('promotion-banner')).toHaveTextContent('1 change');
		await userEvent.click(await findByTestId('promotion-banner-link'));
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: 'promotionSelect',
			data: { projectId: 'project-1', direction: 'promote' },
		});

		// The store replaces the project object, so the change is reactive.
		projectsStore.currentProject = createTestProject({ id: 'project-1', scopes: [] });
		await waitFor(() => expect(queryByTestId('promotion-banner')).not.toBeInTheDocument());
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['project:export'],
		});
		expect(await findByTestId('promotion-banner')).toHaveTextContent('1 change');
		// Listing connections alone is not enough, the direction needs its own scope.
		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:list'] });
		await waitFor(() => expect(queryByTestId('promotion-banner')).not.toBeInTheDocument());
	});

	it('shows nothing while the promotion feature is off', async () => {
		const connectionsRequest = vi.fn(() =>
			connections({
				promote: { id: 'config-1' },
				apply: { id: 'config-2', settings: { branchName: 'main' } },
			}),
		);
		server.get('/api/v1/promotions/connections', connectionsRequest);
		settingsStore.settings = { ...settingsStore.settings, envFeatureFlags: {} };
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:push', 'gitConnection:pull'],
		});
		const { queryByTestId } = renderComponent();

		await waitFor(() => expect(connectionsRequest).not.toHaveBeenCalled());
		expect(queryByTestId('promotion-banner')).not.toBeInTheDocument();
		expect(queryByTestId('promotion-incoming-banner')).not.toBeInTheDocument();
	});

	it('shows incoming changes only with pull access and an apply configuration', async () => {
		const promoteChanges = vi.fn(() => ({ data: { commitSha, changes: [] } }));
		server.get('/api/v1/promotions/connections', () =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		server.get('/rest/promotions/project-1/changes/promote', promoteChanges);
		server.get('/rest/promotions/project-1/changes/apply', () =>
			oneChange('Incoming workflow', 'new'),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('promotion-incoming-banner')).toHaveTextContent('1 incoming change');
		expect(queryByTestId('promotion-banner')).not.toBeInTheDocument();
		// A destination without a promote configuration never asks for outgoing changes.
		expect(promoteChanges).not.toHaveBeenCalled();

		await userEvent.click(await findByTestId('promotion-incoming-banner-link'));
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: 'promotionSelect',
			data: {
				projectId: 'project-1',
				direction: 'apply',
				apply: { connectionId: 'connection-1', configId: 'config-1', branchName: 'main' },
			},
		});

		usersStore.currentUser = mock<IUser>({ globalScopes: ['gitConnection:list'] });
		await waitFor(() => expect(queryByTestId('promotion-incoming-banner')).not.toBeInTheDocument());
	});

	it('refetches both counts after a package was applied', async () => {
		const promoteChanges = vi.fn(() => oneChange('Outgoing workflow', 'modified'));
		const applyChanges = vi.fn(() => oneChange('Incoming workflow', 'new'));
		server.get('/api/v1/promotions/connections', () =>
			connections({
				promote: { id: 'config-1' },
				apply: { id: 'config-2', settings: { branchName: 'main' } },
			}),
		);
		server.get('/rest/promotions/project-1/changes/promote', promoteChanges);
		server.get('/rest/promotions/project-1/changes/apply', applyChanges);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:push', 'gitConnection:pull'],
		});
		const { findByTestId } = renderComponent();
		await findByTestId('promotion-banner');
		await findByTestId('promotion-incoming-banner');

		const renamed = createTestProject({ id: 'project-1', name: 'Renamed' });
		promotionEventBus.emit('applied', { projectId: 'project-1', project: renamed });

		await waitFor(() => expect(promoteChanges).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(applyChanges).toHaveBeenCalledTimes(2));
		// The header shows the project name, which the package may have changed.
		expect(projectsStore.setCurrentProject).toHaveBeenCalledWith(renamed);
	});

	it('leaves the page when the applied package removed the project', async () => {
		server.get('/api/v1/promotions/connections', () =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		server.get('/rest/promotions/project-1/changes/apply', () =>
			oneChange('Incoming workflow', 'new'),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId } = renderComponent();
		await findByTestId('promotion-incoming-banner');

		promotionEventBus.emit('projectRemoved', { projectId: 'project-1' });

		await waitFor(() => expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE));
	});

	it('ignores results for a project the user already left', async () => {
		server.get('/api/v1/promotions/connections', () =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		server.get('/rest/promotions/:projectId/changes/apply', () =>
			oneChange('Incoming workflow', 'new'),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId } = renderComponent();
		await findByTestId('promotion-incoming-banner');
		// The route moves at once, the store still holds the old project until it loaded.
		await router.push('/project-2');
		projectsStore.currentProjectId = 'project-2';

		promotionEventBus.emit('applied', {
			projectId: 'project-1',
			project: createTestProject({ id: 'project-1', name: 'Renamed' }),
		});
		promotionEventBus.emit('projectRemoved', { projectId: 'project-1' });
		await waitAllPromises();

		expect(projectsStore.setCurrentProject).not.toHaveBeenCalled();
		expect(router.currentRoute.value.params.projectId).toBe('project-2');
	});

	it('retries a failed connection lookup on the next project', async () => {
		const lookup = vi
			.spyOn(settingsApi, 'fetchPromotionConnections')
			.mockRejectedValueOnce(new Error('offline'));
		const connectionsRequest = vi.fn(() =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		server.get('/api/v1/promotions/connections', connectionsRequest);
		server.get('/rest/promotions/project-2/changes/apply', () =>
			oneChange('Incoming workflow', 'new'),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId, queryByTestId } = renderComponent();
		await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1));
		// Let the rejection settle, a switch while the lookup is in flight joins the same request.
		await waitAllPromises();
		expect(connectionsRequest).not.toHaveBeenCalled();
		expect(queryByTestId('promotion-incoming-banner')).not.toBeInTheDocument();

		projectsStore.currentProject = createTestProject({
			id: 'project-2',
			scopes: ['project:export'],
		});

		expect(await findByTestId('promotion-incoming-banner')).toHaveTextContent('1 incoming change');
		expect(connectionsRequest).toHaveBeenCalledTimes(1);
	});

	it('refreshes the outgoing count on demand without hiding the banner', async () => {
		const twoChanges = () => ({
			data: {
				commitSha,
				changes: [
					{ id: 'workflow-1', name: 'Changed workflow', type: 'workflow', status: 'modified' },
					{ id: 'workflow-2', name: 'New workflow', type: 'workflow', status: 'new' },
				],
			},
		});
		const promoteChanges = vi.fn(() => oneChange('Changed workflow', 'modified'));
		server.get('/api/v1/promotions/connections', () =>
			connections({ promote: { id: 'config-1' } }),
		);
		server.get('/rest/promotions/project-1/changes/promote', promoteChanges);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:push'],
		});
		const { findByTestId } = renderComponent();

		const banner = await findByTestId('promotion-banner');
		expect(banner).toHaveTextContent('1 change');

		promoteChanges.mockImplementation(twoChanges);
		await userEvent.click(await findByTestId('promotion-banner-refresh'));

		await waitFor(() => {
			expect(promoteChanges).toHaveBeenCalledTimes(2);
			expect(banner).toHaveTextContent('2 changes');
		});
		// The banner never disappears while the manual refresh is in flight.
		expect(banner).toBeInTheDocument();
	});

	it('refreshes the incoming count on demand and clears a previous failure', async () => {
		server.get('/api/v1/promotions/connections', () =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		const applyChanges = vi.fn(
			() => new Response(400, {}, { message: 'The apply direction is not cloned' }),
		);
		server.get('/rest/promotions/project-1/changes/apply', applyChanges);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId } = renderComponent();

		const banner = await findByTestId('promotion-incoming-banner');
		expect(banner).toHaveTextContent('Could not check for incoming changes');

		applyChanges.mockImplementation(() => oneChange('Incoming workflow', 'new'));
		await userEvent.click(await findByTestId('promotion-incoming-banner-refresh'));

		await waitFor(() => {
			expect(applyChanges).toHaveBeenCalledTimes(2);
			expect(banner).toHaveTextContent('1 incoming change');
		});
	});

	it('keeps the incoming changes entry visible when the check fails', async () => {
		server.get('/api/v1/promotions/connections', () =>
			connections({ apply: { id: 'config-1', settings: { branchName: 'main' } } }),
		);
		server.get(
			'/rest/promotions/project-1/changes/apply',
			() => new Response(400, {}, { message: 'The apply direction is not cloned' }),
		);
		usersStore.currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:pull'],
		});
		const { findByTestId } = renderComponent();

		expect(await findByTestId('promotion-incoming-banner')).toHaveTextContent(
			'Could not check for incoming changes',
		);
		// The modal shows the error and offers a retry.
		await userEvent.click(await findByTestId('promotion-incoming-banner-link'));
		expect(uiStore.openModalWithData).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'promotionSelect' }),
		);
	});
});
