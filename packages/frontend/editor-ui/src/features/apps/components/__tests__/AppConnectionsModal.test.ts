import type { DescribedBinding } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
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
	{ id: 'wf-2', name: 'Notify Slack', isArchived: false, activeVersionId: null, nodes: [TRIGGER] },
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

describe('AppConnectionsModal', () => {
	let appsStore: MockedStore<typeof useAppsStore>;
	let uiStore: MockedStore<typeof useUIStore>;

	beforeEach(() => {
		createTestingPinia();
		appsStore = mockedStore(useAppsStore);
		appsStore.bindings = [echoBinding];
		appsStore.addBinding.mockResolvedValue(undefined);
		appsStore.deleteBinding.mockResolvedValue(undefined);
		uiStore = mockedStore(useUIStore);
		uiStore.modalStateById = { [APP_CONNECTIONS_MODAL_KEY]: { open: true } };
		mockedStore(useWorkflowsListStore).searchWorkflows.mockResolvedValue(workflows);
		showMessage.mockReset();
		showError.mockReset();
		confirm.mockReset();
	});

	it('loads the project workflows and lists them with their connection state', async () => {
		const { getAllByTestId, getByRole } = await renderOpen();

		expect(mockedStore(useWorkflowsListStore).searchWorkflows).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'proj-1' }),
		);
		expect(getByRole('heading', { name: 'Connect to app' })).toBeInTheDocument();

		const rows = getAllByTestId('tools-connection-row');
		expect(rows).toHaveLength(3);

		const echo = rowByTitle(rows, 'Echo');
		expect(within(echo).getByTestId('tools-connection-row-connected')).toBeInTheDocument();
		expect(within(echo).queryByTestId('tools-connection-row-warning')).not.toBeInTheDocument();

		const notify = rowByTitle(rows, 'Notify Slack');
		expect(within(notify).queryByTestId('tools-connection-row-connected')).not.toBeInTheDocument();
		expect(within(notify).getByTestId('tools-connection-row-warning')).toHaveTextContent(
			'Not published',
		);

		const survey = rowByTitle(rows, 'Survey');
		expect(within(survey).getByTestId('tools-connection-row-main')).toBeDisabled();
		expect(within(survey).getByTestId('tools-connection-row-disabled')).toHaveAttribute(
			'aria-label',
			'Contains nodes an app cannot run (Wait, Form)',
		);
		expect(rows.indexOf(survey)).toBe(2);
	});

	it('narrows the rows to the search query', async () => {
		const { getAllByTestId, getByPlaceholderText } = await renderOpen();

		await fireEvent.update(getByPlaceholderText('Search workflows...'), 'slack');

		await waitFor(() => {
			const rows = getAllByTestId('tools-connection-row');
			expect(rows).toHaveLength(1);
			expect(rows[0]).toHaveTextContent('Notify Slack');
		});
	});

	it('connects a workflow under a derived key and reports it', async () => {
		const { getAllByTestId } = await renderOpen();

		const notify = rowByTitle(getAllByTestId('tools-connection-row'), 'Notify Slack');
		await userEvent.click(within(notify).getByTestId('tools-connection-row-main'));

		expect(appsStore.addBinding).toHaveBeenCalledWith('proj-1', 'app-1', {
			key: 'notify-slack',
			kind: 'workflow',
			workflowId: 'wf-2',
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Connected. Ask the assistant to use "Notify Slack" in the app.',
			type: 'success',
		});
	});

	it('skips a key that is already taken', async () => {
		appsStore.bindings = [{ ...echoBinding, key: 'notify-slack', workflowId: 'wf-9' }];
		const { getAllByTestId } = await renderOpen();

		const notify = rowByTitle(getAllByTestId('tools-connection-row'), 'Notify Slack');
		await userEvent.click(within(notify).getByTestId('tools-connection-row-main'));

		expect(appsStore.addBinding).toHaveBeenCalledWith(
			'proj-1',
			'app-1',
			expect.objectContaining({ key: 'notify-slack-2' }),
		);
	});

	it('shows an error toast when connecting fails', async () => {
		const failure = new Error('nope');
		appsStore.addBinding.mockRejectedValue(failure);
		const { getAllByTestId } = await renderOpen();

		const notify = rowByTitle(getAllByTestId('tools-connection-row'), 'Notify Slack');
		await userEvent.click(within(notify).getByTestId('tools-connection-row-main'));

		expect(showError).toHaveBeenCalledWith(failure, 'Error connecting to app');
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('disconnects a connected workflow after confirmation', async () => {
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const { getAllByTestId } = await renderOpen();

		const echo = rowByTitle(getAllByTestId('tools-connection-row'), 'Echo');
		await userEvent.click(within(echo).getByTestId('tools-connection-row-main'));

		expect(confirm).toHaveBeenCalledWith(
			expect.stringContaining('disconnect the "Echo" workflow'),
			'Disconnect workflow',
			expect.objectContaining({ confirmButtonText: 'Disconnect' }),
		);
		expect(appsStore.deleteBinding).toHaveBeenCalledWith('proj-1', 'app-1', 'echo');
		expect(appsStore.addBinding).not.toHaveBeenCalled();
	});

	it('keeps the connection when the confirmation is cancelled', async () => {
		confirm.mockResolvedValue('cancel');
		const { getAllByTestId } = await renderOpen();

		const echo = rowByTitle(getAllByTestId('tools-connection-row'), 'Echo');
		await userEvent.click(within(echo).getByTestId('tools-connection-row-main'));

		expect(appsStore.deleteBinding).not.toHaveBeenCalled();
	});

	it('does nothing for an incompatible workflow', async () => {
		const { getAllByTestId } = await renderOpen();

		const survey = rowByTitle(getAllByTestId('tools-connection-row'), 'Survey');
		await userEvent.click(within(survey).getByTestId('tools-connection-row-main'));

		expect(appsStore.addBinding).not.toHaveBeenCalled();
	});
});
