import type { DescribedBinding } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import type { IWorkflowDb } from '@/Interface';

import AppConnectionsModal from '../AppConnectionsModal.vue';
import { useAppsStore } from '../../apps.store';
import { APP_CONNECTIONS_MODAL_KEY } from '../../apps.constants';

const showMessage = vi.hoisted(() => vi.fn());
const showError = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('virtual:node-popularity-data', () => ({ default: [] }));

// N8nDialog teleports out of the tree and N8nRecycleScroller virtualises by
// offsetHeight, which is 0 in jsdom. Replace both with render-all pass-throughs.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2>{{ header }}</h2>
				<slot />
			</div>
		`,
	};
	const N8nRecycleScroller = {
		name: 'N8nRecycleScroller',
		props: ['items', 'itemSize', 'itemKey'],
		methods: { scrollToKey: vi.fn(), scrollTo: vi.fn() },
		template: `
			<div>
				<div v-for="item in items" :key="item[itemKey]">
					<slot :item="item" :update-item-size="() => {}" />
				</div>
			</div>
		`,
	};
	return { ...actual, N8nDialog, N8nRecycleScroller };
});

const TRIGGER = { type: 'n8n-nodes-base.executeWorkflowTrigger', name: 'When called' };

const workflows = [
	{ id: 'wf-1', name: 'Echo', isArchived: false, activeVersionId: 'v-1', nodes: [TRIGGER] },
	{ id: 'wf-2', name: 'Notify Slack', isArchived: false, activeVersionId: 'v-2', nodes: [TRIGGER] },
	{ id: 'wf-4', name: 'Draft Digest', isArchived: false, activeVersionId: null, nodes: [TRIGGER] },
	{
		id: 'wf-3',
		name: 'Survey',
		isArchived: false,
		activeVersionId: 'v-3',
		nodes: [TRIGGER, { type: 'n8n-nodes-base.form', name: 'Form' }],
	},
] as unknown as IWorkflowDb[];

const echoBinding: DescribedBinding = {
	key: 'echo',
	kind: 'workflow',
	workflowId: 'wf-1',
	name: 'Echo',
	published: true,
	input: { type: 'object' },
	output: { type: 'array' },
	outputSource: { kind: 'unknown' },
};

const dataTables = [
	{ id: 'dt-1', name: 'Orders', columns: [], projectId: 'proj-1' },
	{ id: 'dt-2', name: 'Customer Notes', columns: [], projectId: 'proj-1' },
	{ id: 'dt-9', name: 'Foreign Ledger', columns: [], projectId: 'proj-2' },
] as unknown as DataTable[];

const ordersBinding: DescribedBinding = {
	key: 'orders',
	kind: 'dataTable',
	dataTableId: 'dt-1',
	name: 'Orders',
	permissions: ['read', 'write'],
	columns: [],
	row: { type: 'object' },
};

const renderModal = createComponentRenderer(AppConnectionsModal, {
	props: { modalName: APP_CONNECTIONS_MODAL_KEY, data: { projectId: 'proj-1', appId: 'app-1' } },
});

async function renderOpen() {
	const rendered = renderModal();
	await flushPromises();
	return rendered;
}

function rowByTitle(rows: HTMLElement[], title: string) {
	const row = rows.find((candidate) => within(candidate).queryByText(title));
	if (!row) throw new Error(`Row "${title}" not found`);
	return row;
}

async function openDataTab() {
	await userEvent.click(screen.getByRole('tab', { name: /^Data/ }));
}

describe('AppConnectionsModal', () => {
	let appsStore: MockedStore<typeof useAppsStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let dataTableStore: MockedStore<typeof useDataTableStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		appsStore.bindings = [echoBinding, ordersBinding];
		appsStore.addBinding.mockResolvedValue(undefined);
		appsStore.updateBinding.mockResolvedValue(undefined);
		appsStore.deleteBinding.mockResolvedValue(undefined);
		uiStore = mockedStore(useUIStore);
		uiStore.modalStateById = { [APP_CONNECTIONS_MODAL_KEY]: { open: true } };
		mockedStore(useWorkflowsListStore).searchWorkflows.mockResolvedValue(workflows);
		dataTableStore = mockedStore(useDataTableStore);
		dataTableStore.dataTables = dataTables;
		dataTableStore.fetchDataTables.mockResolvedValue(undefined);
		showMessage.mockReset();
		showError.mockReset();
		confirm.mockReset();
	});

	it('lists only published, compatible workflows with their connection state', async () => {
		const { getAllByTestId, getByRole, queryByText } = await renderOpen();

		expect(mockedStore(useWorkflowsListStore).searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'proj-1' }),
		);
		expect(getByRole('heading', { name: 'Connect to app' })).toBeInTheDocument();

		const rows = getAllByTestId('tools-connection-row');
		expect(rows).toHaveLength(2);
		expect(queryByText('Draft Digest')).not.toBeInTheDocument();
		expect(queryByText('Survey')).not.toBeInTheDocument();

		const echo = rowByTitle(rows, 'Echo');
		expect(within(echo).getByTestId('tools-connection-row-connected')).toBeInTheDocument();

		const notify = rowByTitle(rows, 'Notify Slack');
		expect(within(notify).queryByTestId('tools-connection-row-connected')).not.toBeInTheDocument();
	});

	it('renders workflow rows through the same circle icon as table rows', async () => {
		const { getAllByTestId } = await renderOpen();

		const echo = rowByTitle(getAllByTestId('tools-connection-row'), 'Echo');
		expect(echo).toHaveAttribute('data-row-kind', 'service');
		const icon = echo.querySelector('[data-icon="workflow"]');
		expect(icon).not.toBeNull();
		expect(icon?.closest('[class*="wrapper"]')).not.toBeNull();
	});

	it('narrows the rows to the search query', async () => {
		const { getAllByTestId, getByPlaceholderText } = await renderOpen();

		await fireEvent.update(getByPlaceholderText('Search...'), 'slack');

		await waitFor(() => {
			const rows = getAllByTestId('tools-connection-row');
			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveTextContent('Notify Slack');
		});
	});

	async function openDetail(title: string, tab?: () => Promise<void>) {
		const rendered = await renderOpen();
		await tab?.();
		const row = rowByTitle(rendered.getAllByTestId('tools-connection-row'), title);
		await userEvent.click(within(row).getByTestId('tools-connection-row-main'));
		return rendered;
	}

	it('opens a detail view for a workflow row instead of connecting it', async () => {
		const { getByTestId, getByText, queryByTestId, queryByRole } = await openDetail('Notify Slack');

		expect(getByTestId('tools-connection-detail')).toBeInTheDocument();
		expect(getByText('Notify Slack')).toBeInTheDocument();
		expect(getByText('Anyone who can open the app gets this access.')).toBeInTheDocument();
		expect(queryByRole('checkbox')).not.toBeInTheDocument();
		expect(getByTestId('app-binding-connect')).toBeEnabled();
		expect(queryByTestId('app-binding-disconnect')).not.toBeInTheDocument();
		expect(queryByTestId('tools-connection-row')).not.toBeInTheDocument();
		expect(appsStore.addBinding).not.toHaveBeenCalled();
	});

	it('returns to the list from the detail view', async () => {
		const { getByTestId, getAllByTestId, queryByTestId } = await openDetail('Notify Slack');

		await userEvent.click(getByTestId('tools-connection-detail-back'));

		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
		expect(getAllByTestId('tools-connection-row')).toHaveLength(2);
	});

	it('connects a workflow under a derived key and returns to the list', async () => {
		const { getByTestId, queryByTestId } = await openDetail('Notify Slack');

		await userEvent.click(getByTestId('app-binding-connect'));

		expect(appsStore.addBinding).toHaveBeenCalledWith('proj-1', 'app-1', {
			key: 'notify-slack',
			kind: 'workflow',
			workflowId: 'wf-2',
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Connected. Ask the assistant to use "Notify Slack" in the app.',
			type: 'success',
		});
		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
	});

	it('skips a key that is already taken', async () => {
		appsStore.bindings = [{ ...echoBinding, key: 'notify-slack', workflowId: 'wf-9' }];
		const { getByTestId } = await openDetail('Notify Slack');

		await userEvent.click(getByTestId('app-binding-connect'));

		expect(appsStore.addBinding).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			expect.objectContaining({ key: 'notify-slack-2' }),
		);
	});

	it('stays on the detail view and shows an error toast when connecting fails', async () => {
		const failure = new Error('nope');
		appsStore.addBinding.mockRejectedValue(failure);
		const { getByTestId } = await openDetail('Notify Slack');

		await userEvent.click(getByTestId('app-binding-connect'));

		expect(showError).toHaveBeenCalledWith(failure, 'Error connecting to app');
		expect(showMessage).not.toHaveBeenCalled();
		expect(getByTestId('tools-connection-detail')).toBeInTheDocument();
	});

	it('shows Disconnect without Save for a connected workflow', async () => {
		const { getByTestId, queryByTestId } = await openDetail('Echo');

		expect(getByTestId('app-binding-disconnect')).toBeInTheDocument();
		expect(queryByTestId('app-binding-save')).not.toBeInTheDocument();
		expect(queryByTestId('app-binding-connect')).not.toBeInTheDocument();
	});

	it('disconnects a connected workflow after confirmation', async () => {
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const { getByTestId, queryByTestId } = await openDetail('Echo');

		await userEvent.click(getByTestId('app-binding-disconnect'));

		expect(confirm).toHaveBeenCalledWith(
			expect.stringContaining('disconnect the "Echo" workflow'),
			'Disconnect workflow',
			expect.objectContaining({ confirmButtonText: 'Disconnect' }),
		);
		expect(appsStore.deleteBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'echo');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Disconnected "Echo" from the app.',
			type: 'success',
		});
		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
	});

	it('keeps the connection and the detail view when the confirmation is cancelled', async () => {
		confirm.mockResolvedValue('cancel');
		const { getByTestId } = await openDetail('Echo');

		await userEvent.click(getByTestId('app-binding-disconnect'));

		expect(appsStore.deleteBinding).not.toHaveBeenCalled();
		expect(getByTestId('tools-connection-detail')).toBeInTheDocument();
	});

	it('shows an icon on each tab', async () => {
		const { getByTestId } = await renderOpen();

		expect(getByTestId('tab-workflows').querySelector('[data-icon="workflow"]')).not.toBeNull();
		expect(getByTestId('tab-data').querySelector('[data-icon="table"]')).not.toBeNull();
	});

	it('loads the project data tables and lists them on the Data tab with their connection state', async () => {
		const { getAllByTestId, queryByText } = await renderOpen();

		expect(dataTableStore.fetchDataTables).toHaveBeenCalledWith('proj-1', 1, 250);

		await openDataTab();

		const rows = getAllByTestId('tools-connection-row');
		expect(rows).toHaveLength(2);
		expect(queryByText('Foreign Ledger')).not.toBeInTheDocument();

		const orders = rowByTitle(rows, 'Orders');
		expect(orders.querySelector('[data-icon="table"]')).not.toBeNull();
		expect(within(orders).getByTestId('tools-connection-row-connected')).toBeInTheDocument();

		const notes = rowByTitle(rows, 'Customer Notes');
		expect(within(notes).queryByTestId('tools-connection-row-connected')).not.toBeInTheDocument();
	});

	it('shows an error toast when loading the data tables fails', async () => {
		const failure = new Error('nope');
		dataTableStore.fetchDataTables.mockRejectedValue(failure);

		await renderOpen();

		expect(showError).toHaveBeenCalledWith(failure, 'Error loading data tables');
	});

	it('narrows the data tables to the search query', async () => {
		const { getAllByTestId, getByPlaceholderText } = await renderOpen();

		await openDataTab();
		await fireEvent.update(getByPlaceholderText('Search...'), 'notes');

		await waitFor(() => {
			const rows = getAllByTestId('tools-connection-row');
			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveTextContent('Customer Notes');
		});
	});

	it('offers Read and Write, both checked, before connecting a data table', async () => {
		const { getByTestId, getByText, getByRole, queryByTestId } = await openDetail(
			'Customer Notes',
			openDataTab,
		);

		expect(getByTestId('tools-connection-detail')).toBeInTheDocument();
		expect(getByText('Customer Notes')).toBeInTheDocument();
		expect(getByText('Anyone who can open the app gets this access.')).toBeInTheDocument();
		expect(getByRole('checkbox', { name: 'Read' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('checkbox', { name: 'Write' })).toHaveAttribute('aria-checked', 'true');
		expect(getByTestId('app-binding-connect')).toBeEnabled();
		expect(queryByTestId('app-binding-save')).not.toBeInTheDocument();
		expect(appsStore.addBinding).not.toHaveBeenCalled();
	});

	it('disables Connect when neither access level is checked', async () => {
		const { getByTestId, getByRole } = await openDetail('Customer Notes', openDataTab);

		await userEvent.click(getByRole('checkbox', { name: 'Read' }));
		await userEvent.click(getByRole('checkbox', { name: 'Write' }));

		expect(getByTestId('app-binding-connect')).toBeDisabled();
	});

	it('connects a data table with both permissions by default', async () => {
		const { getByTestId } = await openDetail('Customer Notes', openDataTab);

		await userEvent.click(getByTestId('app-binding-connect'));

		expect(appsStore.addBinding).toHaveBeenCalledWith('proj-1', 'app-1', {
			key: 'customer-notes',
			kind: 'dataTable',
			dataTableId: 'dt-2',
			permissions: ['read', 'write'],
		});
	});

	it('connects a data table with the chosen permissions and returns to the list', async () => {
		const { getByTestId, getByRole, queryByTestId } = await openDetail(
			'Customer Notes',
			openDataTab,
		);

		await userEvent.click(getByRole('checkbox', { name: 'Write' }));
		await userEvent.click(getByTestId('app-binding-connect'));

		expect(appsStore.addBinding).toHaveBeenCalledWith('proj-1', 'app-1', {
			key: 'customer-notes',
			kind: 'dataTable',
			dataTableId: 'dt-2',
			permissions: ['read'],
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Connected. Ask the assistant to use "Customer Notes" in the app.',
			type: 'success',
		});
		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
		expect(getByTestId('tools-connection-modal')).toBeInTheDocument();
	});

	it('shows the stored permissions of a connected data table with Save disabled', async () => {
		appsStore.bindings = [{ ...ordersBinding, permissions: ['read'] }];
		const { getByTestId, getByRole, queryByTestId } = await openDetail('Orders', openDataTab);

		expect(getByRole('checkbox', { name: 'Read' })).toHaveAttribute('aria-checked', 'true');
		expect(getByRole('checkbox', { name: 'Write' })).toHaveAttribute('aria-checked', 'false');
		expect(getByTestId('app-binding-save')).toBeDisabled();
		expect(getByTestId('app-binding-disconnect')).toBeInTheDocument();
		expect(queryByTestId('app-binding-connect')).not.toBeInTheDocument();
	});

	it('saves the changed permissions of a connected data table', async () => {
		const { getByTestId, getByRole, queryByTestId } = await openDetail('Orders', openDataTab);

		await userEvent.click(getByRole('checkbox', { name: 'Write' }));
		expect(getByTestId('app-binding-save')).toBeEnabled();
		await userEvent.click(getByTestId('app-binding-save'));

		expect(appsStore.updateBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'orders', {
			permissions: ['read'],
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Access for "Orders" updated.',
			type: 'success',
		});
		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
	});

	it('disconnects a connected data table after confirmation', async () => {
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const { getByTestId, queryByTestId } = await openDetail('Orders', openDataTab);

		await userEvent.click(getByTestId('app-binding-disconnect'));

		expect(confirm).toHaveBeenCalledWith(
			expect.stringContaining('disconnect the "Orders" table'),
			'Disconnect data table',
			expect.objectContaining({ confirmButtonText: 'Disconnect' }),
		);
		expect(appsStore.deleteBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'orders');
		expect(queryByTestId('tools-connection-detail')).not.toBeInTheDocument();
	});
});
