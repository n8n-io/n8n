import type { AppBinding, AppBindingsResponse, AppResponse } from '@n8n/api-types';
import { AGENT_VIEW } from '@n8n/frontend-constants/agents';
import { DATA_TABLE_DETAILS } from '@n8n/frontend-constants/data-tables';
import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { getAppBindings, listBindableResources, setAppBindings } from '../../../apps.api';
import type { AppVersions } from '../../../composables/useAppVersions';
import AppConnectionsCard from './AppConnectionsCard.vue';

vi.mock('../../../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const app: AppResponse = {
	id: 'app-1',
	projectId: 'project-1',
	name: 'SMM Dashboard',
	namespace: 'smm',
	visibility: 'project',
	draftVersionId: 'v1',
	publishedVersionId: null,
	publishedUrl: null,
	createdAt: '2026-10-01T10:00:00.000Z',
	updatedAt: '2026-10-02T10:00:00.000Z',
};

const workflow = {
	key: 'syncSocialStats',
	kind: 'workflow',
	workflowId: 'w1',
} satisfies AppBinding;
const table = {
	key: 'weeklyChannelActivity',
	kind: 'dataTable',
	dataTableId: 't1',
	permissions: ['read'],
} satisfies AppBinding;

const loaded: AppBindingsResponse = {
	versionId: 'v1',
	bindings: [
		{ ...workflow, name: 'Sync social stats', published: false, input: {}, output: {} },
		{ ...table, name: 'Weekly channel activity', columns: [], row: {} },
	],
	warnings: [{ key: 'syncSocialStats', code: 'resource_unpublished', message: '' }],
};

const saved: AppBindingsResponse = { versionId: 'v2', bindings: [], warnings: [] };

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ name: VIEWS.WORKFLOW, path: '/workflow/:workflowId', component: { render: () => null } },
		{
			name: DATA_TABLE_DETAILS,
			path: '/projects/:projectId/datatables/:id',
			component: { render: () => null },
		},
		{
			name: AGENT_VIEW,
			path: '/projects/:projectId/agents/:agentId',
			component: { render: () => null },
		},
	],
});

const refresh = vi.fn();

const renderComponent = createComponentRenderer(AppConnectionsCard, {
	props: { app, versions: { refresh } as unknown as AppVersions },
	global: { plugins: [router] },
});

function providePermissions(scopes: Scope[], readOnly = false) {
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => readOnly,
	});
}

describe('AppConnectionsCard', () => {
	beforeEach(() => {
		vi.mocked(getAppBindings).mockResolvedValue(loaded);
		vi.mocked(setAppBindings).mockResolvedValue(saved);
	});

	afterEach(() => {
		capabilityRegistry.clear();
		vi.clearAllMocks();
	});

	it('shows the bindings of each kind and marks a binding with a warning', async () => {
		providePermissions(['app:update']);
		const { findByTestId, getByTestId, queryByTestId } = renderComponent();

		expect(await findByTestId('app-binding-syncSocialStats')).toHaveTextContent(
			'Sync social stats',
		);
		expect(getByTestId('app-connections-dataTable')).toHaveTextContent('Weekly channel activity');
		expect(getByTestId('app-connections-agent')).toBeInTheDocument();
		expect(getByTestId('app-binding-syncSocialStats-warning')).toBeInTheDocument();
		expect(queryByTestId('app-binding-weeklyChannelActivity-warning')).not.toBeInTheDocument();
	});

	it('hides changes until the connections load', async () => {
		providePermissions(['app:update']);
		const request = Promise.withResolvers<AppBindingsResponse>();
		vi.mocked(getAppBindings).mockReturnValue(request.promise);
		const { findByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('app-binding-add-workflow')).not.toBeInTheDocument();

		request.resolve(loaded);
		expect(await findByTestId('app-binding-add-workflow')).toBeInTheDocument();
	});

	it('hides changes after a load error', async () => {
		providePermissions(['app:update']);
		vi.mocked(getAppBindings).mockRejectedValueOnce(new Error('offline'));
		const { queryByTestId } = renderComponent();

		await waitFor(() => expect(showError).toHaveBeenCalledOnce());
		expect(queryByTestId('app-binding-add-workflow')).not.toBeInTheDocument();
	});

	it('adds a workflow under a key from its name and emits the new draft', async () => {
		providePermissions(['app:update']);
		vi.mocked(listBindableResources).mockResolvedValue({
			count: 1,
			data: [{ id: 'w2', name: 'Post weekly report' }],
		});
		const { findByTestId, emitted } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-add-workflow'));
		await userEvent.click(await findByTestId('app-binding-picker-item-w2'));

		await waitFor(() =>
			expect(setAppBindings).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v1', [
				workflow,
				table,
				{ key: 'postWeeklyReport', kind: 'workflow', workflowId: 'w2' },
			]),
		);
		await waitFor(() => expect(emitted('updated')).toEqual([[{ ...app, draftVersionId: 'v2' }]]));
		expect(refresh).toHaveBeenCalledOnce();
	});

	it('searches resources and shows when more matches exist', async () => {
		providePermissions(['app:update']);
		vi.mocked(listBindableResources)
			.mockResolvedValueOnce({ count: 101, data: [{ id: 'w2', name: 'Another workflow' }] })
			.mockResolvedValueOnce({ count: 1, data: [{ id: 'w3', name: 'Post weekly report' }] });
		const { findByTestId, getByTestId } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-add-workflow'));
		expect(await findByTestId('app-binding-picker-more-results')).toHaveTextContent(
			'Refine your search to see 100 more results',
		);

		await userEvent.type(getByTestId('app-binding-picker-search'), 'post');
		await waitFor(() =>
			expect(listBindableResources).toHaveBeenLastCalledWith(
				expect.anything(),
				'project-1',
				'workflow',
				'post',
			),
		);
		expect(await findByTestId('app-binding-picker-item-w3')).toHaveTextContent(
			'Post weekly report',
		);
	});

	it('adds a data table with the chosen permissions', async () => {
		providePermissions(['app:update']);
		vi.mocked(listBindableResources).mockResolvedValue({
			count: 2,
			data: [
				{ id: 't1', name: 'Weekly channel activity' },
				{ id: 't2', name: 'Orders' },
			],
		});
		const { findByTestId, getByTestId } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-add-dataTable'));
		expect(await findByTestId('app-binding-picker-item-t1')).toBeDisabled();
		await userEvent.click(getByTestId('app-binding-picker-item-t2'));
		await userEvent.click(await findByTestId('app-binding-picker-permission-insert'));
		await userEvent.click(getByTestId('app-binding-picker-confirm'));

		await waitFor(() =>
			expect(setAppBindings).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v1', [
				workflow,
				table,
				{ key: 'orders', kind: 'dataTable', dataTableId: 't2', permissions: ['read', 'insert'] },
			]),
		);
	});

	it('saves permission changes when the binding popover closes', async () => {
		providePermissions(['app:update']);
		const { findByTestId } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-weeklyChannelActivity'));
		await userEvent.click(
			await findByTestId('app-binding-weeklyChannelActivity-permission-insert'),
		);
		await userEvent.click(
			await findByTestId('app-binding-weeklyChannelActivity-permission-delete'),
		);
		expect(setAppBindings).not.toHaveBeenCalled();

		await userEvent.click(await findByTestId('app-binding-weeklyChannelActivity'));

		await waitFor(() =>
			expect(setAppBindings).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v1', [
				workflow,
				{ ...table, permissions: ['read', 'insert', 'delete'] },
			]),
		);
		expect(setAppBindings).toHaveBeenCalledOnce();
	});

	it('removes a binding and links to its resource', async () => {
		providePermissions(['app:update']);
		const { findByTestId, getByRole } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-syncSocialStats'));
		expect(getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/workflow/w1');
		await userEvent.click(await findByTestId('app-binding-syncSocialStats-remove'));

		await waitFor(() =>
			expect(setAppBindings).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1', 'v1', [
				table,
			]),
		);
	});

	it.each([
		['without app:update', [] as Scope[], false],
		['in read-only mode', ['app:update'] as Scope[], true],
	])('shows the bindings but no changes %s', async (_, scopes, readOnly) => {
		providePermissions(scopes, readOnly);
		const { findByTestId, getAllByRole, queryByTestId } = renderComponent();

		await userEvent.click(await findByTestId('app-binding-weeklyChannelActivity'));

		await findByTestId('app-binding-weeklyChannelActivity-permission-read');
		for (const checkbox of getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
		expect(queryByTestId('app-binding-weeklyChannelActivity-remove')).not.toBeInTheDocument();
		expect(queryByTestId('app-binding-add-workflow')).not.toBeInTheDocument();
	});
});
