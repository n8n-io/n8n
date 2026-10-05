import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalDatasetRecord } from '@/features/agents/agentEvals.types';
import InstanceAiTestAgentPreviewPanel from '../components/InstanceAiTestAgentPreviewPanel.vue';

const showErrorMock = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

const target = { agentId: 'agent-1', projectId: 'project-1' };

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

// Replaces the real examples panel for guards that have no reachable UI path
// of their own (e.g. a second "Check your agent" once the suite has already
// started, or a "Save check" on a row the suite no longer has) — it mirrors
// the real component's props/emits so the parent's handlers wire up exactly
// the same way.
const ExamplesPanelStub = defineComponent({
	name: 'InstanceAiTestAgentExamplesPanelStub',
	props: ['examples'],
	emits: ['add-example', 'check-agent', 'stop-run', 'revise-case'],
	setup(props, { emit }) {
		return () =>
			h('div', { 'data-test-id': 'examples-panel-stub' }, [
				h('span', { 'data-test-id': 'stub-examples-count' }, String(props.examples.length)),
				h(
					'button',
					{
						'data-test-id': 'stub-add-example',
						onClick: () => emit('add-example', 'My own example'),
					},
					'Add',
				),
				h(
					'button',
					{ 'data-test-id': 'stub-check-agent', onClick: () => emit('check-agent', 2) },
					'Check',
				),
				h('button', { 'data-test-id': 'stub-stop-run', onClick: () => emit('stop-run') }, 'Stop'),
				h(
					'button',
					{
						'data-test-id': 'stub-revise-missing-row',
						onClick: () => emit('revise-case', { rowId: 999, suggestion: 'fix it' }),
					},
					'Revise missing',
				),
			]);
	},
});

function renderWithExamplesPanelStub() {
	return createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
		props: { target },
		global: { stubs: { InstanceAiTestAgentExamplesPanel: ExamplesPanelStub } },
	})();
}

/** Resolves `previewRun` with a completed try — the default happy path for "try it once". */
function mockPreviewRun(
	store: ReturnType<typeof useAgentEvalsStore>,
	overrides: Partial<{
		input: string;
		whatToCheck: string;
		scenario: string;
		response: string;
	}> = {},
) {
	return vi.spyOn(store, 'previewRun').mockResolvedValue({
		status: 'completed',
		input: 'Summarize the thread',
		whatToCheck: 'mentions the outage',
		scenario: 'Vague',
		response: 'Ticket #48219 is a P1 SSO outage.',
		...overrides,
	});
}

const committedDataset = (id: string, dataTableId: string): AgentEvalDatasetRecord => ({
	id,
	name: 'Draft cases',
	description: null,
	agentId: 'agent-1',
	columnMapping: { input: 'input', criteria: 'criteria' },
	createdById: null,
	createdAt: '',
	updatedAt: '',
	datasetSource: 'data_table',
	datasetRef: { dataTableId },
});

/**
 * The common path through "Check your agent": creates the (empty) draft
 * dataset, resolves it through `getDatasets`, and reads back the given rows
 * (with real row ids) once the cases are inserted.
 */
function mockCommit(
	store: ReturnType<typeof useAgentEvalsStore>,
	options: {
		datasetId?: string;
		dataTableId?: string;
		rows: Array<{ rowId: number; input: string; whatToCheck: string }>;
		runId?: string;
	},
) {
	const datasetId = options.datasetId ?? 'dataset-2';
	const dataTableId = options.dataTableId ?? 'table-2';
	vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
		datasetId,
		dataTableId,
		columnMapping: { input: 'input', criteria: 'criteria' },
	});
	vi.spyOn(store, 'getDatasets').mockReturnValue([committedDataset(datasetId, dataTableId)]);
	vi.spyOn(store, 'createCase').mockResolvedValue(null);
	vi.spyOn(store, 'fetchCases').mockResolvedValue(options.rows);
	vi.spyOn(store, 'startRun').mockResolvedValue({ id: options.runId ?? 'suite-run' } as never);
	vi.spyOn(store, 'openRun').mockImplementation(async () => {});
}

describe('InstanceAiTestAgentPreviewPanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		showErrorMock.mockClear();
	});

	it('runs a single case, then shows its input and output', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);

		const { getByTestId, findByText } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(await findByText('Summarize the thread')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
		expect(store.previewRun).toHaveBeenCalledWith('project-1', 'agent-1', undefined);
	});

	it("shows the builder's own test result directly, without a preview run", async () => {
		const store = useAgentEvalsStore();
		const previewRun = vi.spyOn(store, 'previewRun');

		const { getByTestId, findByText } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
			props: {
				target,
				initialCase: {
					message: 'Summarize the thread about the outage',
					response: 'Ticket #48219 is a P1 SSO outage.',
				},
			},
		})();

		expect(await findByText('Summarize the thread about the outage')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
		expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled();
		expect(previewRun).not.toHaveBeenCalled();
	});

	it('renders the answer as formatted markdown', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, { response: 'A **bold** claim and a [link](https://example.com).' });

		const { container, findByText } = renderComponent();

		expect(await findByText('bold')).toBeInTheDocument();
		expect(container.querySelector('strong')).toHaveTextContent('bold');
		expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
	});

	it('renders the answer inside a fixed-height scrollable container regardless of length', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, {
			response: 'a very long answer that would otherwise grow the card',
		});

		const { findByText, getByTestId } = renderComponent();

		await findByText(/very long answer/);
		// Scoped to the answer card specifically — the panel also has an
		// `N8nCard` earlier in the tree with its own, unrelated `.content` wrapper.
		const answerCard = getByTestId('instance-ai-test-agent-preview-output');
		expect(answerCard.querySelector('[class*="content"]')).toHaveTextContent(/very long answer/);
	});

	it('shows the sample-input prompt instead of dismissing when "Needs work" is clicked', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);

		const user = userEvent.setup();
		const { getByTestId, findByTestId, emitted } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-needs-work')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-needs-work'));

		expect(await findByTestId('instance-ai-test-agent-preview-sample-input')).toBeInTheDocument();
		expect(emitted().dismiss).toBeUndefined();
	});

	it('emits dismiss when "Don\'t create evals" is clicked', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);

		const user = userEvent.setup();
		const { findByTestId, emitted } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));
		await user.click(await findByTestId('instance-ai-test-agent-preview-dont-create-evals'));

		expect(emitted().dismiss).toEqual([[]]);
	});

	it('submits a suggestion, re-runs the preview with it, and shows the new answer', async () => {
		const store = useAgentEvalsStore();
		const previewRun = vi
			.spyOn(store, 'previewRun')
			.mockResolvedValueOnce({
				status: 'completed',
				input: 'x',
				whatToCheck: 'y',
				scenario: 'Vague',
				response: 'y',
			})
			.mockResolvedValueOnce({
				status: 'completed',
				input: 'What is the refund policy?',
				whatToCheck: 'mentions 30 days',
				scenario: 'Vague',
				response: 'Yes, within 30 days.',
			});

		const user = userEvent.setup();
		const { findByTestId, findByText } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));

		const input = await findByTestId('instance-ai-test-agent-preview-sample-input');
		await user.type(input, 'Can I get my money back?');
		await user.click(await findByTestId('instance-ai-test-agent-preview-submit-sample'));

		expect(await findByText('Yes, within 30 days.')).toBeInTheDocument();
		expect(previewRun).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {
			suggestion: 'Can I get my money back?',
			previousInput: 'x',
			previousOutput: 'y',
		});
	});

	it('generates a batch of examples and shows the examples panel on "Looks good"', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, { scenario: 'Upset' });
		const generateDraftCases = vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [
				{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
				{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
			],
		});
		mockCommit(store, {
			rows: [
				{ rowId: 1, input: 'a', whatToCheck: 'b' },
				{ rowId: 2, input: 'c', whatToCheck: 'd' },
			],
		});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [
				{
					sourceRowId: '1',
					status: 'success',
					input: { input: 'a' },
					output: { finalText: 'b answer' },
				} as never,
				{
					sourceRowId: '2',
					status: 'success',
					input: { input: 'c' },
					output: { finalText: 'd answer' },
				} as never,
			],
			resultsCount: 2,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const {
			getByTestId,
			emitted,
			findByTestId,
			findAllByTestId,
			getByText,
			queryByTestId,
			findByText,
		} = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));

		expect(emitted().confirm).toEqual([[]]);
		expect(await findByTestId('instance-ai-test-agent-examples-check-agent')).toBeInTheDocument();
		expect(generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', {
			count: 10,
			save: false,
			exampleInput: 'Summarize the thread',
			exampleOutput: 'Ticket #48219 is a P1 SSO outage.',
		});

		// Default slider value is 2, so only 2 of the generated examples show —
		// newest-revealed on top, so "c" (the later one) comes before "a".
		const examples = await findAllByTestId('instance-ai-test-agent-examples-example');
		expect(examples).toHaveLength(2);
		expect(within(examples[0]).getByText('c')).toBeInTheDocument();
		expect(within(examples[1]).getByText('a')).toBeInTheDocument();
		// Each row labels itself with its own generated scenario tag.
		expect(getByText('Upset')).toBeInTheDocument();
		expect(within(examples[0]).getByText('Sensitive data')).toBeInTheDocument();
		expect(within(examples[1]).getByText('Vague')).toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		expect(store.createDraftDataset).toHaveBeenCalledWith('project-1', 'agent-1');
		expect(store.createCase).toHaveBeenCalledTimes(2);
		expect(store.createCase).toHaveBeenCalledWith(
			'project-1',
			expect.objectContaining({ datasetId: 'dataset-2' }),
			{ input: 'a', whatToCheck: 'b' },
		);
		expect(store.createCase).toHaveBeenCalledWith(
			'project-1',
			expect.objectContaining({ datasetId: 'dataset-2' }),
			{ input: 'c', whatToCheck: 'd' },
		);
		expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');

		// Settles immediately (the mocked run is already "completed") — collapses
		// straight to the summary pill instead of the per-case list.
		expect(await findByText('2 of 2 went well, 0 need work')).toBeInTheDocument();
		expect(getByText('Saved 2 checks')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

		expect(await findByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
		await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));
		expect(getByText('b answer')).toBeInTheDocument();
		expect(getByText('d answer')).toBeInTheDocument();
	});

	it('only creates the cases within the slider cap — nothing is persisted, then deleted, for the rest', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: Array.from({ length: 10 }, (_, i) => ({
				input: `case-${i}`,
				whatToCheck: 'check',
				scenario: 'Vague',
			})),
		});
		mockCommit(store, {
			rows: [
				{ rowId: 1, input: 'case-0', whatToCheck: 'check' },
				{ rowId: 2, input: 'case-1', whatToCheck: 'check' },
			],
		});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
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

		const user = userEvent.setup();
		const { getByTestId, findByTestId, queryByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		// Default slider value (2) caps the generated batch of 10 — only those
		// two are ever created; the other 8 are never written anywhere.
		await waitFor(() => expect(store.createCase).toHaveBeenCalledTimes(2));
		expect(store.createCase).toHaveBeenCalledWith('project-1', expect.anything(), {
			input: 'case-0',
			whatToCheck: 'check',
		});
		expect(store.createCase).toHaveBeenCalledWith('project-1', expect.anything(), {
			input: 'case-1',
			whatToCheck: 'check',
		});
		expect(store.createCase).not.toHaveBeenCalledWith('project-1', expect.anything(), {
			input: 'case-2',
			whatToCheck: 'check',
		});
		expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');

		// Only the two kept rows show, both waiting since the run hasn't settled yet.
		expect(await findByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		expect(await findByTestId('instance-ai-test-agent-examples-case-2')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-case-3')).not.toBeInTheDocument();
	});

	it('deletes the draft dataset when a case fails to save, and never starts a run', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
			datasetId: 'dataset-2',
			dataTableId: 'table-2',
			columnMapping: { input: 'input', criteria: 'criteria' },
		});
		vi.spyOn(store, 'createCase').mockRejectedValue(new Error('row insert failed'));
		const deleteDataset = vi.spyOn(store, 'deleteDataset').mockResolvedValue(undefined as never);
		const startRun = vi.spyOn(store, 'startRun');

		const user = userEvent.setup();
		const { getByTestId, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		await waitFor(() =>
			expect(deleteDataset).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2'),
		);
		expect(startRun).not.toHaveBeenCalled();
		await waitFor(() => expect(showErrorMock).toHaveBeenCalled());
	});

	// Once `startRun` has been sent, a failure is ambiguous — the request may
	// have reached the server and seeded a real run before the response itself
	// failed. Deleting the dataset here would cascade a run that may actually
	// exist, so rollback only ever covers failures strictly before submission.
	it('does not delete the dataset when only starting the run fails', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
			datasetId: 'dataset-2',
			dataTableId: 'table-2',
			columnMapping: { input: 'input', criteria: 'criteria' },
		});
		vi.spyOn(store, 'createCase').mockResolvedValue(null);
		vi.spyOn(store, 'fetchCases').mockResolvedValue([{ rowId: 1, input: 'a', whatToCheck: 'b' }]);
		vi.spyOn(store, 'startRun').mockRejectedValue(new Error('timeout'));
		const deleteDataset = vi.spyOn(store, 'deleteDataset');

		const user = userEvent.setup();
		const { getByTestId, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		await waitFor(() => expect(showErrorMock).toHaveBeenCalled());
		expect(deleteDataset).not.toHaveBeenCalled();
	});

	it('hides the confirmed try, shows how many are left, and stops the run on request', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [
				{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
				{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
			],
		});
		mockCommit(store, {
			rows: [
				{ rowId: 1, input: 'a', whatToCheck: 'b' },
				{ rowId: 2, input: 'c', whatToCheck: 'd' },
			],
		});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		const cancelRun = vi.spyOn(store, 'cancelRun').mockResolvedValue({ id: 'suite-run' } as never);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [
				{ sourceRowId: '1', status: 'success', input: {}, output: { finalText: 'ok' } } as never,
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { getByTestId, findByTestId, queryByTestId, findByText } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');
		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		// One of the two cases has settled — one is still left.
		expect(await findByText('Checking, 1 left')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-try')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-stop'));

		expect(cancelRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2', 'suite-run');
	});

	it('recovers the stop button when cancelling the suite run fails', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [
				{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
				{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
			],
		});
		mockCommit(store, {
			rows: [
				{ rowId: 1, input: 'a', whatToCheck: 'b' },
				{ rowId: 2, input: 'c', whatToCheck: 'd' },
			],
		});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		const cancelRun = vi.spyOn(store, 'cancelRun').mockRejectedValue(new Error('boom'));
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [
				{ sourceRowId: '1', status: 'success', input: {}, output: { finalText: 'ok' } } as never,
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { getByTestId, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');
		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));
		await findByTestId('instance-ai-test-agent-examples-stop');

		await user.click(getByTestId('instance-ai-test-agent-examples-stop'));

		expect(cancelRun).toHaveBeenCalled();
		// The failed cancel must not leave the button stuck in its loading state.
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-examples-stop')).not.toHaveAttribute('aria-busy'),
		);
		expect(getByTestId('instance-ai-test-agent-examples-stop')).toBeEnabled();
	});

	it('dismisses with a toast when the preview run fails to start', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'previewRun').mockRejectedValue(new Error('boom'));

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('dismisses when the preview run does not complete successfully', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'previewRun').mockResolvedValue({ status: 'failed' });

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('does not generate the suite twice on a rapid double click of "Looks good"', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		const generateDraftCases = vi
			.spyOn(store, 'generateDraftCases')
			.mockResolvedValue({ cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }] });
		mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [],
			resultsCount: 0,
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

		expect(generateDraftCases).toHaveBeenCalledTimes(1);
	});

	it('does not throw when the preview run resolves after the panel unmounts', async () => {
		const store = useAgentEvalsStore();
		let resolvePreview!: (value: {
			status: 'completed';
			input: string;
			whatToCheck: string;
			scenario: string;
			response: string;
		}) => void;
		vi.spyOn(store, 'previewRun').mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolvePreview = resolve;
				}),
		);

		const { unmount } = renderComponent();
		await waitFor(() => expect(store.previewRun).toHaveBeenCalled());

		unmount();
		resolvePreview({
			status: 'completed',
			input: 'x',
			whatToCheck: 'y',
			scenario: 'Vague',
			response: 'y',
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('stops polling when unmounted mid-run', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
		});
		mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
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

		const user = userEvent.setup();
		const { getByTestId, findByTestId, unmount } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');
		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));
		await waitFor(() => expect(store.startPollingRun).toHaveBeenCalled());

		unmount();

		expect(stopPollingRun).toHaveBeenCalled();
	});

	it('does not start the suite run if the panel unmounts while committing', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
			datasetId: 'dataset-2',
			dataTableId: 'table-2',
			columnMapping: { input: 'input', criteria: 'criteria' },
		});
		vi.spyOn(store, 'getDatasets').mockReturnValue([committedDataset('dataset-2', 'table-2')]);
		vi.spyOn(store, 'createCase').mockResolvedValue(null);
		let resolveFetchCases!: (
			rows: Array<{ rowId: number; input: string; whatToCheck: string }>,
		) => void;
		vi.spyOn(store, 'fetchCases').mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveFetchCases = resolve;
				}),
		);
		const startRun = vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'suite-run' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});

		const user = userEvent.setup();
		const { getByTestId, findByTestId, unmount } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');
		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));
		await waitFor(() => expect(store.fetchCases).toHaveBeenCalled());

		unmount();
		resolveFetchCases([{ rowId: 1, input: 'a', whatToCheck: 'b' }]);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(startRun).not.toHaveBeenCalled();
	});

	describe('adding your own example', () => {
		function mockReachableSuiteReady(store: ReturnType<typeof useAgentEvalsStore>) {
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
		}

		async function confirmIntoSuiteReady(
			getByTestId: ReturnType<typeof renderWithExamplesPanelStub>['getByTestId'],
		) {
			const user = userEvent.setup();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			return user;
		}

		it('keeps the typed example in memory only — nothing is persisted until commit', async () => {
			const store = useAgentEvalsStore();
			mockReachableSuiteReady(store);
			const createCase = vi.spyOn(store, 'createCase');

			const { getByTestId, findByTestId } = renderWithExamplesPanelStub();
			const user = await confirmIntoSuiteReady(getByTestId);
			await findByTestId('stub-add-example');

			await user.click(getByTestId('stub-add-example'));

			expect(createCase).not.toHaveBeenCalled();
		});

		it('includes the self-written example among the rows created on commit', async () => {
			const store = useAgentEvalsStore();
			mockReachableSuiteReady(store);
			mockCommit(store, {
				rows: [
					{ rowId: 1, input: 'a', whatToCheck: 'b' },
					{ rowId: 2, input: 'My own example', whatToCheck: '' },
				],
			});
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [],
				resultsCount: 0,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const { getByTestId, findByTestId } = renderWithExamplesPanelStub();
			const user = await confirmIntoSuiteReady(getByTestId);
			await findByTestId('stub-add-example');
			await user.click(getByTestId('stub-add-example'));

			await user.click(getByTestId('stub-check-agent'));

			await waitFor(() =>
				expect(store.createCase).toHaveBeenCalledWith('project-1', expect.anything(), {
					input: 'My own example',
					whatToCheck: '',
				}),
			);
			// The generated case the slider kept is still included alongside it.
			expect(store.createCase).toHaveBeenCalledWith('project-1', expect.anything(), {
				input: 'a',
				whatToCheck: 'b',
			});
		});
	});

	describe('"Check your agent" guards', () => {
		it('does not start a second suite run once one has already started', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			const createDraftDataset = vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			vi.spyOn(store, 'getDatasets').mockReturnValue([committedDataset('dataset-2', 'table-2')]);
			vi.spyOn(store, 'createCase').mockResolvedValue(null);
			vi.spyOn(store, 'fetchCases').mockResolvedValue([{ rowId: 1, input: 'a', whatToCheck: 'b' }]);
			vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'suite-run' } as never);
			vi.spyOn(store, 'openRun').mockImplementation(async () => {});
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [],
				resultsCount: 0,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const { getByTestId } = renderWithExamplesPanelStub();
			const user = userEvent.setup();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await waitFor(() => expect(getByTestId('stub-check-agent')).toBeInTheDocument());

			await user.click(getByTestId('stub-check-agent'));
			await waitFor(() => expect(createDraftDataset).toHaveBeenCalledTimes(1));

			await user.click(getByTestId('stub-check-agent'));

			expect(createDraftDataset).toHaveBeenCalledTimes(1);
		});

		it('does not open the suite run if the panel unmounts right after it starts', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			vi.spyOn(store, 'createDraftDataset').mockResolvedValue({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				columnMapping: { input: 'input', criteria: 'criteria' },
			});
			vi.spyOn(store, 'getDatasets').mockReturnValue([committedDataset('dataset-2', 'table-2')]);
			vi.spyOn(store, 'createCase').mockResolvedValue(null);
			vi.spyOn(store, 'fetchCases').mockResolvedValue([{ rowId: 1, input: 'a', whatToCheck: 'b' }]);
			let resolveStartRun!: (value: never) => void;
			vi.spyOn(store, 'startRun').mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolveStartRun = resolve;
					}),
			);
			const openRun = vi.spyOn(store, 'openRun').mockImplementation(async () => {});

			const user = userEvent.setup();
			const { getByTestId, findByTestId, unmount } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await user.click(await findByTestId('instance-ai-test-agent-examples-check-agent'));
			await waitFor(() => expect(store.startRun).toHaveBeenCalledTimes(1));

			unmount();
			resolveStartRun({ id: 'suite-run' } as never);
			await Promise.resolve();
			await Promise.resolve();

			expect(openRun).not.toHaveBeenCalled();
		});
	});

	describe('"Stop" guards', () => {
		it('does not cancel a run before "Check your agent" has started one', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			const cancelRun = vi.spyOn(store, 'cancelRun');

			const { getByTestId, findByTestId } = renderWithExamplesPanelStub();
			const user = userEvent.setup();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await user.click(await findByTestId('stub-stop-run'));

			expect(cancelRun).not.toHaveBeenCalled();
		});

		it('does not toast after the panel unmounts while a cancel request is still pending', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
			vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
			let rejectCancel!: (error: Error) => void;
			const cancelRun = vi.spyOn(store, 'cancelRun').mockImplementation(
				async () =>
					await new Promise((_resolve, reject) => {
						rejectCancel = reject;
					}),
			);
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

			const user = userEvent.setup();
			const { getByTestId, findByTestId, unmount } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await user.click(await findByTestId('instance-ai-test-agent-examples-check-agent'));
			await user.click(await findByTestId('instance-ai-test-agent-examples-stop'));
			await waitFor(() => expect(cancelRun).toHaveBeenCalled());

			unmount();
			rejectCancel(new Error('boom'));
			await Promise.resolve();
			await Promise.resolve();

			expect(showErrorMock).not.toHaveBeenCalled();
		});
	});

	describe('"Save check" / revision flow', () => {
		it('regenerates a failed case with the suggestion, updates it, and reruns the suite', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			const generateDraftCases = vi
				.spyOn(store, 'generateDraftCases')
				.mockResolvedValueOnce({
					cases: [
						{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
						{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
					],
				})
				.mockResolvedValueOnce({
					cases: [{ input: 'c, revised', whatToCheck: 'd, revised', scenario: 'Sensitive data' }],
				});
			mockCommit(store, {
				rows: [
					{ rowId: 1, input: 'a', whatToCheck: 'b' },
					{ rowId: 2, input: 'c', whatToCheck: 'd' },
				],
			});
			const updateCase = vi.spyOn(store, 'updateCase').mockResolvedValue(true);
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockImplementation((runId) => {
				if (runId === 'revised-run') {
					return {
						run: { status: 'completed' } as never,
						results: [
							{
								sourceRowId: '1',
								status: 'success',
								input: { input: 'a' },
								output: { finalText: 'b answer' },
							} as never,
							{
								sourceRowId: '2',
								status: 'success',
								input: { input: 'c, revised' },
								output: { finalText: 'd, revised answer' },
							} as never,
						],
						resultsCount: 2,
						ratingsByResultId: {},
						pendingByResultId: {},
						draftsByResultId: {},
						counts: null,
						loading: false,
						loadingMore: false,
					};
				}
				return {
					run: { status: 'completed' } as never,
					results: [
						{
							sourceRowId: '1',
							status: 'success',
							input: { input: 'a' },
							output: { finalText: 'b answer' },
						} as never,
						{
							sourceRowId: '2',
							status: 'error',
							input: { input: 'c' },
							output: { finalText: 'd answer' },
						} as never,
					],
					resultsCount: 2,
					ratingsByResultId: {},
					pendingByResultId: {},
					draftsByResultId: {},
					counts: null,
					loading: false,
					loadingMore: false,
				};
			});
			vi.spyOn(store, 'startRun')
				.mockResolvedValueOnce({ id: 'suite-run' } as never)
				.mockResolvedValueOnce({ id: 'revised-run' } as never);

			const user = userEvent.setup();
			const { getByTestId, findByTestId, findByText } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			expect(await findByText('1 of 2 went well, 1 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-2-suggestion'),
				'Apologise and link the open ticket.',
			);
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-save-check'));

			expect(generateDraftCases).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {
				count: 1,
				suggestion: 'Apologise and link the open ticket.',
				previousInput: 'c',
				previousOutput: 'd answer',
			});
			expect(updateCase).toHaveBeenCalledWith(
				'project-1',
				{
					datasetId: 'dataset-2',
					dataTableId: 'table-2',
					columns: { input: 'input', whatToCheck: 'criteria' },
				},
				2,
				{ input: 'c, revised', whatToCheck: 'd, revised' },
			);
			expect(store.startRun).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', 'dataset-2');
			expect(await findByText('2 of 2 went well, 0 need work')).toBeInTheDocument();
			expect(
				within(getByTestId('instance-ai-test-agent-examples-case-2')).getAllByText('c, revised'),
			).not.toHaveLength(0);
		});

		it('toasts an error and does not mutate the case or rerun when saving the revision fails', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			const generateDraftCases = vi
				.spyOn(store, 'generateDraftCases')
				.mockResolvedValueOnce({
					cases: [
						{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
						{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
					],
				})
				.mockResolvedValueOnce({
					cases: [{ input: 'c, revised', whatToCheck: 'd, revised', scenario: 'Sensitive data' }],
				});
			mockCommit(store, {
				rows: [
					{ rowId: 1, input: 'a', whatToCheck: 'b' },
					{ rowId: 2, input: 'c', whatToCheck: 'd' },
				],
			});
			// The dataset write fails — the panel must not act as if the revision
			// had been saved.
			const updateCase = vi.spyOn(store, 'updateCase').mockResolvedValue(false);
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						sourceRowId: '1',
						status: 'success',
						input: { input: 'a' },
						output: { finalText: 'b answer' },
					} as never,
					{
						sourceRowId: '2',
						status: 'error',
						input: { input: 'c' },
						output: { finalText: 'd answer' },
					} as never,
				],
				resultsCount: 2,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const user = userEvent.setup();
			const { getByTestId, findByTestId, findByText } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			expect(await findByText('1 of 2 went well, 1 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));

			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-2-suggestion'),
				'Apologise and link the open ticket.',
			);
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-save-check'));

			await waitFor(() => expect(updateCase).toHaveBeenCalled());
			expect(generateDraftCases).toHaveBeenCalledTimes(2);
			// The failed save must not advance the tally, rerun the suite, or show
			// the un-persisted replacement text as if it had been saved.
			expect(await findByText('1 of 2 went well, 1 need work')).toBeInTheDocument();
			expect(store.startRun).toHaveBeenCalledTimes(1);
			expect(
				within(getByTestId('instance-ai-test-agent-examples-case-2')).queryByText('c, revised'),
			).not.toBeInTheDocument();
		});

		it('ignores a second "Save check" while one revision is already in flight', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			const generateDraftCases = vi
				.spyOn(store, 'generateDraftCases')
				.mockResolvedValueOnce({
					// Both generated cases fail — the default slider cap (2) matches
					// this batch exactly, so "Check your agent" keeps both rows.
					cases: [
						{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
						{ input: 'e', whatToCheck: 'f', scenario: 'Off topic' },
					],
				})
				// The revision call for case 1 never resolves — keeps `revisingRowId`
				// set for the rest of the test, so case 2's "Save check" has
				// something to race against instead of a guard that already cleared.
				.mockImplementationOnce(async () => await new Promise(() => {}));
			mockCommit(store, {
				rows: [
					{ rowId: 1, input: 'c', whatToCheck: 'd' },
					{ rowId: 2, input: 'e', whatToCheck: 'f' },
				],
			});
			vi.spyOn(store, 'updateCase').mockResolvedValue(true);
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						sourceRowId: '1',
						status: 'error',
						input: { input: 'c' },
						output: { finalText: 'd answer' },
					} as never,
					{
						sourceRowId: '2',
						status: 'error',
						input: { input: 'e' },
						output: { finalText: 'f answer' },
					} as never,
				],
				resultsCount: 2,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const user = userEvent.setup();
			const { getByTestId, findByTestId, findByText } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			expect(await findByText('0 of 2 went well, 2 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));
			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-1-suggestion'),
				'Fix case 1.',
			);
			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-2-suggestion'),
				'Fix case 2.',
			);

			// The revision call for case 1 never resolves, so `revisingRowId` stays
			// set for case 1 the whole time — case 2's own button stays enabled
			// (only the revising row's own button disables), so this exercises the
			// shared `revisingRowId` guard rather than a disabled-button no-op.
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-save-check'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-2-save-check'));

			// 1 suite generation + 1 revision (case 1) — case 2's click was a no-op.
			expect(generateDraftCases).toHaveBeenCalledTimes(2);
			expect(store.startRun).toHaveBeenCalledTimes(1);
		});

		it('ignores a revision for a row that is not part of the current suite', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			const generateDraftCases = vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const { getByTestId, findByTestId } = renderWithExamplesPanelStub();
			const user = userEvent.setup();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('stub-revise-missing-row');

			await user.click(getByTestId('stub-revise-missing-row'));

			// Suite generation only — no second call for the missing row's revision.
			expect(generateDraftCases).toHaveBeenCalledTimes(1);
		});

		it('does not update the case when the revision regenerates no replacement', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			const generateDraftCases = vi
				.spyOn(store, 'generateDraftCases')
				.mockResolvedValueOnce({
					cases: [{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' }],
				})
				.mockResolvedValueOnce({ cases: [] });
			mockCommit(store, { rows: [{ rowId: 1, input: 'c', whatToCheck: 'd' }] });
			const updateCase = vi.spyOn(store, 'updateCase').mockResolvedValue(true);
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						sourceRowId: '1',
						status: 'error',
						input: { input: 'c' },
						output: { finalText: 'd answer' },
					} as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const user = userEvent.setup();
			const { getByTestId, findByTestId, findByText } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			expect(await findByText('0 of 1 went well, 1 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-1-suggestion'),
				'Try again.',
			);
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-save-check'));

			await waitFor(() => expect(generateDraftCases).toHaveBeenCalledTimes(2));
			expect(updateCase).not.toHaveBeenCalled();
		});

		it('does not update the case if the panel unmounts while the revision is regenerating', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			let resolveRevision!: (value: {
				cases: Array<{ input: string; whatToCheck: string; scenario: string }>;
			}) => void;
			const generateDraftCases = vi
				.spyOn(store, 'generateDraftCases')
				.mockResolvedValueOnce({
					cases: [{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' }],
				})
				.mockImplementationOnce(
					async () =>
						await new Promise((resolve) => {
							resolveRevision = resolve;
						}),
				);
			mockCommit(store, { rows: [{ rowId: 1, input: 'c', whatToCheck: 'd' }] });
			const updateCase = vi.spyOn(store, 'updateCase').mockResolvedValue(true);
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						sourceRowId: '1',
						status: 'error',
						input: { input: 'c' },
						output: { finalText: 'd answer' },
					} as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const user = userEvent.setup();
			const { getByTestId, findByTestId, unmount } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));
			await findByTestId('instance-ai-test-agent-examples-summary-toggle');
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
			await user.type(
				getByTestId('instance-ai-test-agent-examples-case-1-suggestion'),
				'Try again.',
			);
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-save-check'));
			await waitFor(() => expect(generateDraftCases).toHaveBeenCalledTimes(2));

			unmount();
			resolveRevision({
				cases: [{ input: 'c, revised', whatToCheck: 'd, revised', scenario: 'Sensitive data' }],
			});
			await Promise.resolve();
			await Promise.resolve();

			expect(updateCase).not.toHaveBeenCalled();
		});
	});

	describe('"Run check" / rerun flow', () => {
		it('reruns the suite dataset as-is, without regenerating the case', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			const generateDraftCases = vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [
					{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
					{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
				],
			});
			mockCommit(store, {
				rows: [
					{ rowId: 1, input: 'a', whatToCheck: 'b' },
					{ rowId: 2, input: 'c', whatToCheck: 'd' },
				],
			});
			const updateCase = vi.spyOn(store, 'updateCase');
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						id: 'result-1',
						sourceRowId: '1',
						status: 'success',
						input: { input: 'a' },
						output: { finalText: 'b answer' },
					} as never,
					{
						id: 'result-2',
						sourceRowId: '2',
						status: 'error',
						input: { input: 'c' },
						output: { finalText: 'd answer' },
					} as never,
				],
				resultsCount: 2,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});
			const rerunResult = vi
				.spyOn(store, 'rerunResult')
				.mockResolvedValue({ id: 'result-1', runId: 'suite-run' } as never);

			const user = userEvent.setup();
			const { getByTestId, findByTestId, findByText } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			expect(await findByText('1 of 2 went well, 1 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			// Case 1 passed — it gets "Run check" instead of the correction controls.
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));

			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-run-check'));

			expect(rerunResult).toHaveBeenCalledWith('project-1', 'agent-1', 'result-1');
			// No whole-suite rerun, no regeneration — only that one case ran again.
			expect(store.startRun).toHaveBeenCalledTimes(1);
			expect(generateDraftCases).toHaveBeenCalledTimes(1);
			expect(updateCase).not.toHaveBeenCalled();
		});

		it('toasts an error when the rerun fails, without touching the suite', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, { scenario: 'Upset' });
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						id: 'result-1',
						sourceRowId: '1',
						status: 'success',
						input: { input: 'a' },
						output: { finalText: 'b answer' },
					} as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});
			vi.spyOn(store, 'rerunResult').mockRejectedValue(new Error('timeout'));

			const user = userEvent.setup();
			const { getByTestId, findByTestId } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));
			await findByTestId('instance-ai-test-agent-examples-summary-toggle');
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));

			await user.click(getByTestId('instance-ai-test-agent-examples-case-1-run-check'));

			await waitFor(() => expect(showErrorMock).toHaveBeenCalled());
			// The loading state clears so the row can be retried.
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-examples-case-1-run-check')).not.toHaveAttribute(
					'aria-busy',
					'true',
				),
			);
		});
	});

	describe('"Needs work" / sample-input guards', () => {
		it('ignores a stray "Needs work" click from a stale button reference after confirming', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [],
				resultsCount: 0,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});

			const { getByTestId, queryByTestId, findByTestId } = renderComponent();
			await waitFor(() =>
				expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
			);
			const looksGood = getByTestId('instance-ai-test-agent-preview-looks-good');
			const needsWork = getByTestId('instance-ai-test-agent-preview-needs-work');

			// Both buttons are still the same DOM nodes in this tick — Vue hasn't
			// patched the phase change in yet. A stray second click on the old
			// "Needs work" node must not divert the already-confirmed flow to the
			// sample-input prompt.
			await fireEvent.click(looksGood);
			await fireEvent.click(needsWork);

			expect(await findByTestId('instance-ai-test-agent-examples-check-agent')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-preview-sample-input')).not.toBeInTheDocument();
		});

		it('does not submit a whitespace-only correction via the keyboard shortcut', async () => {
			const store = useAgentEvalsStore();
			const previewRun = mockPreviewRun(store);

			const user = userEvent.setup();
			const { findByTestId } = renderComponent();
			await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));

			const input = await findByTestId('instance-ai-test-agent-preview-sample-input');
			// `N8nInput` binds plain Enter too, so the guard inside the handler —
			// not the disabled submit button — is what has to refuse this.
			await user.type(input, '   {Enter}');

			// Only the initial preview call — no revision call for the blank submit.
			expect(previewRun).toHaveBeenCalledTimes(1);
			expect(await findByTestId('instance-ai-test-agent-preview-sample-input')).toBeInTheDocument();
		});
	});
});
