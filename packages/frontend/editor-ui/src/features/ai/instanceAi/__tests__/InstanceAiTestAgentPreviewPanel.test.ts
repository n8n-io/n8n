import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import type { AgentEvalVerdict } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalDatasetRecord } from '@/features/agents/agentEvals.types';
import InstanceAiTestAgentPreviewPanel from '../components/InstanceAiTestAgentPreviewPanel.vue';

const showErrorMock = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

const target = { agentId: 'agent-1', projectId: 'project-1' };

const PASS_VERDICT: AgentEvalVerdict = {
	status: 'completed',
	outcome: 'pass',
	reasoning: 'It named the ticket, the customer and the priority.',
};
const SUGGESTION = 'Always name the ticket id.';
const FAIL_VERDICT: AgentEvalVerdict = {
	status: 'completed',
	outcome: 'fail',
	reasoning: 'It never named the ticket.',
	suggestion: SUGGESTION,
};
// The judge could not grade the answer, so it is neither a pass nor a fail.
const UNGRADED_VERDICT: AgentEvalVerdict = {
	status: 'error',
	outcome: null,
	reasoning: 'judge model timed out',
};

const STEP = 'instance-ai-test-agent-preview-first-check';
const TITLE = 'instance-ai-test-agent-preview-first-check-title';
const SUGGESTION_BLOCK = 'instance-ai-test-agent-preview-suggestion';
const PRACTICE_MORE = 'instance-ai-test-agent-preview-practice-more';
const TRY_FOR_REAL = 'instance-ai-test-agent-preview-try-for-real';
const THREAD = 'agent-thread-preview';

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

function mockPreviewRun(
	store: ReturnType<typeof useAgentEvalsStore>,
	overrides: Partial<{
		input: string;
		whatToCheck: string;
		response: string;
		verdict: AgentEvalVerdict;
	}> = {},
) {
	return vi.spyOn(store, 'previewRun').mockResolvedValue({
		status: 'completed',
		input: 'Summarize the thread',
		whatToCheck: 'mentions the outage',
		scenario: 'Vague',
		response: 'Ticket #48219 is a P1 SSO outage.',
		verdict: PASS_VERDICT,
		...overrides,
	});
}

const existingDataset: AgentEvalDatasetRecord = {
	id: 'dataset-1',
	name: 'Checks',
	description: null,
	agentId: 'agent-1',
	columnMapping: { input: 'input', criteria: 'criteria' },
	createdById: null,
	createdAt: '',
	updatedAt: '',
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'table-1' },
};

/** Runs the playback of the preview run: the reply, then the verdict. */
async function playBack() {
	await vi.advanceTimersByTimeAsync(1400);
	await vi.advanceTimersByTimeAsync(1600);
}

describe('InstanceAiTestAgentPreviewPanel', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		setActivePinia(createTestingPinia());
		showErrorMock.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

	it('shows a running step line while the first check runs, then says how it went', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId(TITLE)).toHaveTextContent('Running a first check on your agent…');
		expect(queryByTestId(PRACTICE_MORE)).not.toBeInTheDocument();
		await waitFor(() => expect(store.previewRun).toHaveBeenCalledWith('project-1', 'agent-1'));

		await playBack();

		expect(getByTestId(TITLE)).toHaveTextContent('First check: handled well');
		expect(getByTestId(PRACTICE_MORE)).toBeInTheDocument();
		expect(getByTestId(TRY_FOR_REAL)).toBeInTheDocument();
		expect(getByTestId('instance-ai-first-check-tease')).toBeInTheDocument();
	});

	it('opens to the thread, which shows each step of the run in turn', async () => {
		const store = useAgentEvalsStore();
		let finishRun: () => void = () => {};
		const previewRun = mockPreviewRun(store);
		const result = await previewRun.getMockImplementation()?.('project-1', 'agent-1');
		previewRun.mockReturnValue(
			new Promise((resolve) => {
				finishRun = () => resolve(result as never);
			}),
		);
		const user = setupUser();

		const { getByTestId, getByText } = renderComponent();
		await user.click(getByTestId(STEP));

		const thread = getByTestId(THREAD);
		expect(thread).toHaveAttribute('data-state', 'preparing');
		expect(getByText('Writing a message a customer might send…')).toBeInTheDocument();

		finishRun();

		await waitFor(() => expect(thread).toHaveAttribute('data-state', 'awaiting-reply'));
		expect(getByText('Summarize the thread')).toBeInTheDocument();
		expect(getByText('Waiting for your agent to reply…')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1400);
		expect(thread).toHaveAttribute('data-state', 'analyzing');
		expect(getByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(1600);
		expect(thread).toHaveAttribute('data-state', 'pass');
		expect(getByText('Follows the rule.')).toBeInTheDocument();
	});

	it('reads a check the judge could not grade as one that could be better', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, { verdict: UNGRADED_VERDICT });

		const { getByTestId, queryByTestId } = renderComponent();
		await playBack();

		expect(getByTestId(TITLE)).toHaveTextContent('First check: could be more resilient');
		expect(queryByTestId(SUGGESTION_BLOCK)).not.toBeInTheDocument();
		expect(getByTestId(PRACTICE_MORE)).toBeInTheDocument();
	});

	it('toasts and dismisses when the preview run does not complete', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'previewRun').mockResolvedValue({ status: 'error' } as never);

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toHaveLength(1));
		expect(showErrorMock).toHaveBeenCalledTimes(1);
	});

	it('toasts and dismisses when the preview run fails', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'previewRun').mockRejectedValue(new Error('boom'));

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toHaveLength(1));
		expect(showErrorMock).toHaveBeenCalledTimes(1);
	});

	it('does nothing after it is gone while the preview run is pending', async () => {
		const store = useAgentEvalsStore();
		let resolveRun: (value: Awaited<ReturnType<typeof store.previewRun>>) => void = () => {};
		vi.spyOn(store, 'previewRun').mockReturnValue(
			new Promise((resolve) => {
				resolveRun = resolve;
			}),
		);

		const { unmount, emitted } = renderComponent();
		unmount();
		resolveRun({ status: 'error' } as never);
		await vi.advanceTimersByTimeAsync(0);

		expect(emitted().dismiss).toBeUndefined();
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	describe("the builder's own test result", () => {
		const builderCase = {
			message: 'Summarize the thread about the outage',
			response: 'Ticket #48219 is a P1 SSO outage.',
		};

		it('is shown directly, without a preview run, when it has both a rule and a verdict', async () => {
			const store = useAgentEvalsStore();
			const previewRun = vi.spyOn(store, 'previewRun');
			const user = setupUser();

			const { getByTestId, getByText } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
				props: {
					target,
					initialCase: { ...builderCase, whatToCheck: 'names the ticket', verdict: PASS_VERDICT },
				},
			})();

			expect(getByTestId(TITLE)).toHaveTextContent('First check: handled well');
			await user.click(getByTestId(STEP));
			expect(getByText('Summarize the thread about the outage')).toBeInTheDocument();
			expect(previewRun).not.toHaveBeenCalled();
		});

		it('opens on its suggestion when it failed', async () => {
			const store = useAgentEvalsStore();
			vi.spyOn(store, 'previewRun');

			const { getByTestId } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
				props: {
					target,
					initialCase: { ...builderCase, whatToCheck: 'names the ticket', verdict: FAIL_VERDICT },
				},
			})();

			expect(getByTestId(TITLE)).toHaveTextContent('First check: could be more resilient');
			await waitFor(() => expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'needs-work'));
			expect(getByTestId(SUGGESTION_BLOCK)).toHaveTextContent(SUGGESTION);
			expect(store.previewRun).not.toHaveBeenCalled();
		});

		it.each([
			['has no rule or verdict', {}],
			['has a rule but no verdict', { whatToCheck: 'names the ticket' }],
			['has a verdict but no rule', { verdict: PASS_VERDICT }],
			['has a blank rule', { whatToCheck: '', verdict: PASS_VERDICT }],
		])(
			'is not reused when it %s: a case is drafted, run and judged instead',
			async (_label, extra) => {
				const store = useAgentEvalsStore();
				const previewRun = mockPreviewRun(store);

				const { getByTestId } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
					props: { target, initialCase: { ...builderCase, ...extra } },
				})();

				expect(getByTestId(TITLE)).toHaveTextContent('Running a first check on your agent…');
				await waitFor(() => expect(previewRun).toHaveBeenCalledTimes(1));
			},
		);
	});

	describe('a check that could be better', () => {
		async function renderFailed() {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { verdict: FAIL_VERDICT });
			const user = setupUser();
			const utils = renderComponent();
			await playBack();
			return { store, user, ...utils };
		}

		it('opens on its suggestion, and holds the next steps until the person decides', async () => {
			const { getByTestId, queryByTestId, getByText } = await renderFailed();

			expect(getByTestId(TITLE)).toHaveTextContent('First check: could be more resilient');
			expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'needs-work');
			expect(getByText(/It never named the ticket\./)).toBeInTheDocument();
			expect(getByTestId(SUGGESTION_BLOCK)).toHaveTextContent(SUGGESTION);
			expect(queryByTestId(PRACTICE_MORE)).not.toBeInTheDocument();
		});

		it('hides the suggestion on "Actually fine" and offers the next steps', async () => {
			const { user, getByTestId, queryByTestId } = await renderFailed();

			await user.click(getByTestId(`${SUGGESTION_BLOCK}-dismiss`));

			expect(queryByTestId(SUGGESTION_BLOCK)).not.toBeInTheDocument();
			expect(getByTestId(PRACTICE_MORE)).toBeInTheDocument();
		});

		it('applies the suggestion to the same message, and the thread follows the rerun', async () => {
			const { store, user, getByTestId, getByText, queryByTestId } = await renderFailed();
			vi.spyOn(store, 'applyPreviewSuggestion').mockResolvedValue({
				configHash: 'hash-2',
				preview: {
					status: 'completed',
					input: 'Summarize the thread',
					whatToCheck: 'mentions the outage',
					scenario: 'Vague',
					response: 'Ticket #48219 is a P1 outage for Acme Corp.',
					verdict: PASS_VERDICT,
				},
			});

			await user.click(getByTestId(`${SUGGESTION_BLOCK}-apply`));

			expect(store.applyPreviewSuggestion).toHaveBeenCalledWith('project-1', 'agent-1', {
				input: 'Summarize the thread',
				whatToCheck: 'mentions the outage',
				suggestion: SUGGESTION,
			});
			await waitFor(() => expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'analyzing'));
			expect(getByText('Ticket #48219 is a P1 outage for Acme Corp.')).toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(1200);

			expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'pass');
			expect(getByTestId(TITLE)).toHaveTextContent('First check: handled well after the change');
			expect(getByText('Your agent is better now.')).toBeInTheDocument();
			expect(queryByTestId(SUGGESTION_BLOCK)).not.toBeInTheDocument();
			expect(getByTestId(PRACTICE_MORE)).toBeInTheDocument();
		});

		it('says so when the rerun still could be better', async () => {
			const { store, user, getByTestId, queryByText } = await renderFailed();
			vi.spyOn(store, 'applyPreviewSuggestion').mockResolvedValue({
				configHash: 'hash-2',
				preview: {
					status: 'completed',
					input: 'Summarize the thread',
					whatToCheck: 'mentions the outage',
					scenario: 'Vague',
					response: 'Still vague.',
					verdict: { ...FAIL_VERDICT, reasoning: 'Still no ticket.' },
				},
			});

			await user.click(getByTestId(`${SUGGESTION_BLOCK}-apply`));
			await vi.advanceTimersByTimeAsync(1200);

			expect(getByTestId(TITLE)).toHaveTextContent('First check: still could be more resilient');
			expect(queryByText('Your agent is better now.')).not.toBeInTheDocument();
		});

		it('keeps the suggestion when applying fails', async () => {
			const { store, user, getByTestId } = await renderFailed();
			vi.spyOn(store, 'applyPreviewSuggestion').mockRejectedValue(new Error('boom'));

			await user.click(getByTestId(`${SUGGESTION_BLOCK}-apply`));

			await waitFor(() => expect(showErrorMock).toHaveBeenCalledTimes(1));
			expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'needs-work');
			expect(getByTestId(SUGGESTION_BLOCK)).toBeInTheDocument();
		});

		it('toasts and hides the old suggestion when the rerun does not complete', async () => {
			const { store, user, getByTestId, queryByTestId } = await renderFailed();
			vi.spyOn(store, 'applyPreviewSuggestion').mockResolvedValue({
				configHash: 'hash-2',
				preview: { status: 'error' } as never,
			});

			await user.click(getByTestId(`${SUGGESTION_BLOCK}-apply`));

			await waitFor(() => expect(showErrorMock).toHaveBeenCalledTimes(1));
			expect(getByTestId(THREAD)).toHaveAttribute('data-state', 'needs-work');
			expect(queryByTestId(SUGGESTION_BLOCK)).not.toBeInTheDocument();
		});
	});

	describe('Practice more', () => {
		async function renderPassed() {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'requestAddCheckOpen');
			const user = setupUser();
			const utils = renderComponent();
			await playBack();
			return { store, user, ...utils };
		}

		it('saves the first check, runs it once, then opens the Checks tab with Add a check open', async () => {
			const { store, user, getByTestId, emitted } = await renderPassed();
			vi.spyOn(store, 'fetchDatasets').mockResolvedValue([]);
			vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			vi.spyOn(store, 'createCase').mockResolvedValue(null);
			vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);

			await user.click(getByTestId(PRACTICE_MORE));

			await waitFor(() => expect(emitted()['practice-more']).toHaveLength(1));
			expect(emitted().confirm).toHaveLength(1);
			expect(store.createDraftDataset).toHaveBeenCalledWith('project-1', 'agent-1');
			expect(store.createCase).toHaveBeenCalledWith(
				'project-1',
				{
					datasetId: 'dataset-2',
					dataTableId: 'table-2',
					columns: expect.objectContaining({ input: 'input' }),
				},
				{ input: 'Summarize the thread', whatToCheck: 'mentions the outage' },
			);
			expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');
			expect(store.requestAddCheckOpen).toHaveBeenCalledWith('agent-1');
		});

		it('keeps the checks of an agent that already has them', async () => {
			const { store, user, getByTestId, emitted } = await renderPassed();
			vi.spyOn(store, 'fetchDatasets').mockResolvedValue([existingDataset]);
			vi.spyOn(store, 'createDraftDataset');
			vi.spyOn(store, 'startRun');

			await user.click(getByTestId(PRACTICE_MORE));

			await waitFor(() => expect(emitted()['practice-more']).toHaveLength(1));
			expect(store.createDraftDataset).not.toHaveBeenCalled();
			expect(store.startRun).not.toHaveBeenCalled();
			expect(store.requestAddCheckOpen).toHaveBeenCalledWith('agent-1');
		});

		it('deletes the draft and toasts when the check cannot be saved', async () => {
			const { store, user, getByTestId, emitted } = await renderPassed();
			vi.spyOn(store, 'fetchDatasets').mockResolvedValue([]);
			vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			vi.spyOn(store, 'createCase').mockRejectedValue(new Error('boom'));
			vi.spyOn(store, 'deleteDraftDataset').mockResolvedValue(undefined);
			vi.spyOn(store, 'startRun');

			await user.click(getByTestId(PRACTICE_MORE));

			await waitFor(() => expect(showErrorMock).toHaveBeenCalledTimes(1));
			expect(store.deleteDraftDataset).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');
			expect(store.startRun).not.toHaveBeenCalled();
			expect(emitted()['practice-more']).toBeUndefined();
		});

		it('does not delete the dataset when only starting the run fails', async () => {
			const { store, user, getByTestId } = await renderPassed();
			vi.spyOn(store, 'fetchDatasets').mockResolvedValue([]);
			vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			vi.spyOn(store, 'createCase').mockResolvedValue(null);
			vi.spyOn(store, 'startRun').mockRejectedValue(new Error('boom'));
			vi.spyOn(store, 'deleteDraftDataset');

			await user.click(getByTestId(PRACTICE_MORE));

			await waitFor(() => expect(showErrorMock).toHaveBeenCalledTimes(1));
			expect(store.deleteDraftDataset).not.toHaveBeenCalled();
		});
	});

	it('opens the chat preview on "Try it for real"', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		const user = setupUser();
		const { getByTestId, emitted } = renderComponent();
		await playBack();

		await user.click(getByTestId(TRY_FOR_REAL));

		expect(emitted().confirm).toHaveLength(1);
		expect(emitted()['try-agent']).toHaveLength(1);
	});
});
