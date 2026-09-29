import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import InstanceAiTestAgentPreviewPanel from '../components/InstanceAiTestAgentPreviewPanel.vue';

const target = { agentId: 'agent-1', projectId: 'project-1' };

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

describe('InstanceAiTestAgentPreviewPanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('generates and runs a single case, then shows its input and output', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'Summarize the thread', whatToCheck: 'mentions the outage' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({
			id: 'run-1',
			datasetId: 'dataset-1',
			agentVersionId: null,
			status: 'new',
			runAt: null,
			completedAt: null,
			metrics: null,
			errorCode: null,
			errorDetails: null,
			createdById: null,
			createdAt: '',
			updatedAt: '',
		});
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [
				{
					id: 'result-1',
					runId: 'run-1',
					sourceRowId: '1',
					runIndex: 0,
					status: 'success',
					input: { input: 'Summarize the thread' },
					output: { finalText: 'Ticket #48219 is a P1 SSO outage.' },
					toolCalls: null,
					metrics: null,
					runAt: '',
					completedAt: '',
					errorCode: null,
					errorDetails: null,
					createdAt: '',
					updatedAt: '',
				},
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { getByTestId, findByText } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(await findByText('Summarize the thread')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
		expect(store.generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', { count: 1 });
		expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-1');
	});

	it('emits dismiss when "Needs work" is clicked', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-needs-work')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-needs-work'));

		expect(emitted().dismiss).toEqual([[]]);
	});

	it('generates the rest of the suite and shows a confirmation on "Looks good"', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases')
			.mockResolvedValueOnce({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				cases: [{ input: 'x', whatToCheck: 'y' }],
			})
			.mockResolvedValueOnce({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				cases: [
					{ input: 'a', whatToCheck: 'b' },
					{ input: 'c', whatToCheck: 'd' },
				],
			});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { getByTestId, emitted, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));

		expect(emitted().confirm).toEqual([[]]);
		expect(await findByTestId('instance-ai-test-agent-preview-suite-ready')).toBeInTheDocument();
		expect(store.generateDraftCases).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {});

		await user.click(getByTestId('instance-ai-test-agent-preview-open-evals'));
		expect(emitted()['open-evals']).toEqual([[]]);
	});

	it('dismisses with a toast when generation fails', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockRejectedValue(new Error('boom'));

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('dismisses when the preview run loses track of settling', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'hasLostTrackOfRun').mockReturnValue(true);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [],
			resultsCount: 0,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('does not generate the suite twice on a rapid double click of "Looks good"', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { getByTestId } = renderComponent();
		const button = await waitFor(() => {
			const el = getByTestId('instance-ai-test-agent-preview-looks-good');
			expect(el).toBeEnabled();
			return el;
		});

		// Two synchronous fires in the same tick, before Vue removes the button —
		// `fireEvent` (unlike `userEvent`) dispatches without awaiting between
		// clicks, which is what this guard protects against.
		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(store.generateDraftCases).toHaveBeenCalledTimes(2); // 1 preview + 1 suite, not 3
	});

	it('stops polling when unmounted mid-generation', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		const stopPollingRun = vi.spyOn(store, 'stopPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [],
			resultsCount: 0,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { unmount } = renderComponent();
		await waitFor(() => expect(store.startPollingRun).toHaveBeenCalled());

		unmount();

		expect(stopPollingRun).toHaveBeenCalled();
	});
});
