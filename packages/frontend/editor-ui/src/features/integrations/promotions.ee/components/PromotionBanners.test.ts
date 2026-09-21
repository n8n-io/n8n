import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createServer, Response } from 'miragejs';
import { mock } from 'vitest-mock-extended';
import type { IUser } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import PromotionBanners from './PromotionBanners.vue';
import { invalidatePromotionConnection } from '../composables/usePromotionConnection';

const renderComponent = createComponentRenderer(PromotionBanners);

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

	beforeEach(() => {
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
		// The connection is cached per page load; tests must not share it.
		invalidatePromotionConnection();
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
			data: { projectId: 'project-1' },
		});

		// The store replaces the project object, so the change is reactive.
		projectsStore.currentProject = createTestProject({ id: 'project-1', scopes: [] });
		await waitFor(() => expect(queryByTestId('promotion-banner')).not.toBeInTheDocument());
		projectsStore.currentProject = createTestProject({
			id: 'project-1',
			scopes: ['project:export'],
		});
		expect(await findByTestId('promotion-banner')).toHaveTextContent('1 change');
		usersStore.currentUser = mock<IUser>({ globalScopes: [] });
		await waitFor(() => expect(queryByTestId('promotion-banner')).not.toBeInTheDocument());
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
