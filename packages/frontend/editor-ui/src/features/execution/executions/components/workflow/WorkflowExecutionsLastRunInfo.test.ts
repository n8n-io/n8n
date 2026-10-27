import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { computed, shallowRef } from 'vue';
import { getWorkflowStatisticsTimes } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import WorkflowExecutionsLastRunInfo from './WorkflowExecutionsLastRunInfo.vue';

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal()),
	getWorkflowStatisticsTimes: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowExecutionsLastRunInfo, {
	global: {
		provide: {
			[WorkflowIdKey as unknown as string]: computed(() => 'wf-1'),
		},
	},
});

describe('WorkflowExecutionsLastRunInfo', () => {
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-10-25T10:00:00.000Z'));
		createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.isWorkflowSaved = { 'wf-1': true };
		vi.mocked(getWorkflowStatisticsTimes).mockResolvedValue({
			productionSuccess: '2026-10-20T10:00:00.000Z',
			productionError: '2026-10-21T10:00:00.000Z',
			manualSuccess: null,
			manualError: null,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it('shows the last production execution times in a tooltip', async () => {
		const { findByTestId, queryByTestId } = renderComponent();

		await userEvent.hover(await findByTestId('last-production-execution-icon'));

		expect(await findByTestId('last-production-success')).toHaveTextContent('Succeeded 5 days ago');
		expect(await findByTestId('last-production-error')).toHaveTextContent('Failed 4 days ago');
		expect(queryByTestId('last-production-execution-note')).not.toBeInTheDocument();
		expect(getWorkflowStatisticsTimes).toHaveBeenCalledWith(expect.anything(), 'wf-1');
	});

	it('loads the times again when the pointer enters the icon', async () => {
		const { findByTestId } = renderComponent();
		const icon = await findByTestId('last-production-execution-icon');
		expect(getWorkflowStatisticsTimes).toHaveBeenCalledTimes(1);

		vi.mocked(getWorkflowStatisticsTimes).mockResolvedValue({
			productionSuccess: '2026-10-25T08:00:00.000Z',
			productionError: null,
			manualSuccess: null,
			manualError: null,
		});
		vi.setSystemTime(new Date('2026-10-25T10:00:31.000Z'));
		await userEvent.hover(icon);

		expect(getWorkflowStatisticsTimes).toHaveBeenCalledTimes(2);
		expect(await findByTestId('last-production-success')).toHaveTextContent(
			'Succeeded 2 hours ago',
		);
	});

	it('shows the note when the workflow does not save all production executions', async () => {
		settingsStore.saveDataSuccessExecution = 'none';
		const { findByTestId } = renderComponent();

		await userEvent.hover(await findByTestId('last-production-execution-icon'));

		expect(await findByTestId('last-production-execution-note')).toBeInTheDocument();
	});

	it('does not load the times again on hover within the refresh interval', async () => {
		const { findByTestId } = renderComponent();
		const icon = await findByTestId('last-production-execution-icon');

		vi.setSystemTime(new Date('2026-10-25T10:00:29.000Z'));
		await userEvent.hover(icon);
		await userEvent.unhover(icon);
		await userEvent.hover(icon);

		expect(getWorkflowStatisticsTimes).toHaveBeenCalledTimes(1);
	});

	it('treats a DEFAULT workflow setting as the instance default', async () => {
		const { findByTestId, queryByTestId } = renderComponent({
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'wf-1'),
					[WorkflowDocumentStoreKey as unknown as string]: shallowRef({
						getSettingsSnapshot: () => ({
							saveDataSuccessExecution: 'DEFAULT',
							saveDataErrorExecution: 'DEFAULT',
						}),
					}),
				},
			},
		});

		await userEvent.hover(await findByTestId('last-production-execution-icon'));

		expect(await findByTestId('last-production-success')).toBeInTheDocument();
		expect(queryByTestId('last-production-execution-note')).not.toBeInTheDocument();
	});

	it('hides the icon when the workflow has no recorded production execution', async () => {
		vi.mocked(getWorkflowStatisticsTimes).mockResolvedValue({
			productionSuccess: null,
			productionError: null,
			manualSuccess: null,
			manualError: null,
		});
		const { queryByTestId } = renderComponent();

		await waitFor(() => expect(getWorkflowStatisticsTimes).toHaveBeenCalled());
		await flushPromises();
		expect(queryByTestId('last-production-execution-icon')).not.toBeInTheDocument();
	});

	it('does not request the statistics for an unsaved workflow', async () => {
		workflowsStore.isWorkflowSaved = {};
		const { queryByTestId } = renderComponent();

		await waitFor(() =>
			expect(queryByTestId('last-production-execution-icon')).not.toBeInTheDocument(),
		);
		expect(getWorkflowStatisticsTimes).not.toHaveBeenCalled();
	});
});
