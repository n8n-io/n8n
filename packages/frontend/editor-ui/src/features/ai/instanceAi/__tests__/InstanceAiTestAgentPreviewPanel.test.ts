import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
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

// Rows render `AgentEvalTryRow`, whose delete-check button opens this —
// mocked so a test can resolve it directly instead of needing the (separately
// mounted, app-wide) modal component rendered in this tree.
const { openAgentConfirmationModal } = vi.hoisted(() => ({
	openAgentConfirmationModal: vi.fn(),
}));
vi.mock('@/features/agents/composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal }),
}));

const target = { agentId: 'agent-1', projectId: 'project-1' };

const PASS_VERDICT: AgentEvalVerdict = {
	status: 'completed',
	outcome: 'pass',
	reasoning: 'It named the ticket, the customer and the priority.',
};
const FAIL_VERDICT: AgentEvalVerdict = {
	status: 'completed',
	outcome: 'fail',
	reasoning: 'It never named the ticket.',
};
// The judge could not grade the answer, so it is neither a pass nor a fail.
const UNGRADED_VERDICT: AgentEvalVerdict = {
	status: 'error',
	outcome: null,
	reasoning: 'judge model timed out',
};

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

// Replaces the real examples panel for guards that have no reachable UI path
// of their own (e.g. a second "Check your agent" once the suite has already
// started) — it mirrors
// the real component's props/emits so the parent's handlers wire up exactly
// the same way.
const ExamplesPanelStub = defineComponent({
	name: 'InstanceAiTestAgentExamplesPanelStub',
	props: ['examples'],
	emits: ['add-example', 'check-agent', 'stop-run'],
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
		openAgentConfirmationModal.mockReset();
	});

	it('runs a single case, then shows its message and the judge’s findings', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store);

		const { getByTestId, findByTestId } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(await findByTestId('instance-ai-test-agent-preview-example')).toHaveTextContent(
			'“Summarize the thread”',
		);
		expect(getByTestId('instance-ai-test-agent-preview-findings')).toHaveTextContent(
			'It named the ticket, the customer and the priority.',
		);
		expect(store.previewRun).toHaveBeenCalledWith('project-1', 'agent-1', undefined);
	});

	describe("the builder's own test result", () => {
		const builderCase = {
			message: 'Summarize the thread about the outage',
			response: 'Ticket #48219 is a P1 SSO outage.',
		};

		it('is shown directly, without a preview run, when it has both a rule and a verdict', async () => {
			const store = useAgentEvalsStore();
			const previewRun = vi.spyOn(store, 'previewRun');

			const { getByTestId, findByTestId } = createComponentRenderer(
				InstanceAiTestAgentPreviewPanel,
				{
					props: {
						target,
						initialCase: {
							...builderCase,
							whatToCheck: 'names the ticket',
							verdict: PASS_VERDICT,
						},
					},
				},
			)();

			expect(await findByTestId('instance-ai-test-agent-preview-example')).toHaveTextContent(
				'“Summarize the thread about the outage”',
			);
			expect(getByTestId('instance-ai-test-agent-preview-first-check-title')).toHaveTextContent(
				'First check passed',
			);
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled();
			expect(previewRun).not.toHaveBeenCalled();
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

				const { findByTestId } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
					props: { target, initialCase: { ...builderCase, ...extra } },
				})();

				expect(await findByTestId('instance-ai-test-agent-preview-example')).toHaveTextContent(
					'“Summarize the thread”',
				);
				expect(previewRun).toHaveBeenCalledTimes(1);
			},
		);
	});

	it('renders the answer as formatted markdown', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, { response: 'A **bold** claim and a [link](https://example.com).' });

		const user = userEvent.setup();
		const { container, findByText, findByTestId } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-toggle-conversation'));

		expect(await findByText('bold')).toBeInTheDocument();
		expect(container.querySelector('strong')).toHaveTextContent('bold');
		expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
	});

	it('renders the answer inside a fixed-height scrollable container regardless of length', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, {
			response: 'a very long answer that would otherwise grow the card',
		});

		const user = userEvent.setup();
		const { findByText, getByTestId, findByTestId } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-toggle-conversation'));

		await findByText(/very long answer/);
		// Scoped to the answer card specifically.
		const answerCard = getByTestId('instance-ai-test-agent-preview-output');
		expect(answerCard.querySelector('[class*="content"]')).toHaveTextContent(/very long answer/);
	});

	it('shows the sample-input prompt instead of dismissing when "Needs work" is clicked', async () => {
		const store = useAgentEvalsStore();
		mockPreviewRun(store, { verdict: FAIL_VERDICT });

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
		mockPreviewRun(store, { verdict: FAIL_VERDICT });

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
				verdict: FAIL_VERDICT,
			})
			.mockResolvedValueOnce({
				status: 'completed',
				input: 'What is the refund policy?',
				whatToCheck: 'mentions 30 days',
				scenario: 'Vague',
				response: 'Yes, within 30 days.',
				verdict: PASS_VERDICT,
			});

		const user = userEvent.setup();
		const { findByTestId } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));

		const input = await findByTestId('instance-ai-test-agent-preview-sample-input');
		await user.type(input, 'Can I get my money back?');
		await user.click(await findByTestId('instance-ai-test-agent-preview-submit-sample'));

		expect(await findByTestId('instance-ai-test-agent-preview-example')).toHaveTextContent(
			'“What is the refund policy?”',
		);
		expect(
			await findByTestId('instance-ai-test-agent-preview-first-check-title'),
		).toHaveTextContent('First check passed');
		expect(previewRun).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {
			suggestion: 'Can I get my money back?',
			previousInput: 'x',
			previousOutput: 'y',
		});
	});

	it('generates a batch of examples and shows the examples panel on "Check harder cases"', async () => {
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));

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
		// The confirmed try is saved too, as the first check — ahead of the extras.
		expect(store.createCase).toHaveBeenCalledTimes(3);
		expect(store.createCase).toHaveBeenNthCalledWith(
			1,
			'project-1',
			expect.objectContaining({ datasetId: 'dataset-2' }),
			{ input: 'Summarize the thread', whatToCheck: 'mentions the outage' },
		);
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
		// A row's chevron hands off to the full eval view rather than expanding here.
		await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
		expect(emitted()['open-evals']).toHaveLength(1);
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		// Default slider value (2) caps the generated batch of 10 — only those two
		// (plus the confirmed try) are ever created; the other 8 are never written.
		await waitFor(() => expect(store.createCase).toHaveBeenCalledTimes(3));
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
		const deleteDraftDataset = vi
			.spyOn(store, 'deleteDraftDataset')
			.mockResolvedValue(undefined as never);
		const startRun = vi.spyOn(store, 'startRun');

		const user = userEvent.setup();
		const { getByTestId, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		await waitFor(() =>
			expect(deleteDraftDataset).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2'),
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
		const deleteDraftDataset = vi.spyOn(store, 'deleteDraftDataset');

		const user = userEvent.setup();
		const { getByTestId, findByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		await waitFor(() => expect(showErrorMock).toHaveBeenCalled());
		expect(deleteDraftDataset).not.toHaveBeenCalled();
	});

	describe('when the run cannot be started', () => {
		/** Commits one case and clicks "Check your agent", with `startRun` rejecting. */
		async function commitWithFailingStart(
			latestRunId: string | null,
		): Promise<
			{ store: ReturnType<typeof useAgentEvalsStore> } & ReturnType<typeof renderComponent>
		> {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});
			mockCommit(store, { rows: [{ rowId: 1, input: 'a', whatToCheck: 'b' }] });
			vi.spyOn(store, 'startRun').mockRejectedValue(new Error('timeout'));
			// The store types this as `string`, but it resolves `null` for a never-run dataset.
			vi.spyOn(store, 'resolveLatestRunId').mockResolvedValue(latestRunId as string);
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

			const user = userEvent.setup();
			const view = renderComponent();
			await waitFor(() =>
				expect(view.getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(view.getByTestId('instance-ai-test-agent-preview-check-harder'));
			await view.findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(view.getByTestId('instance-ai-test-agent-examples-check-agent'));
			return { store, ...view };
		}

		// The response may have been lost after the server already seeded a run.
		it('picks up a run the server did create, instead of showing a failure', async () => {
			const { store, queryByTestId } = await commitWithFailingStart('suite-run-from-server');

			await waitFor(() =>
				expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'suite-run-from-server'),
			);
			expect(queryByTestId('instance-ai-test-agent-examples-run-failed')).not.toBeInTheDocument();
			expect(showErrorMock).not.toHaveBeenCalled();
		});

		it('offers a retry when no run exists, and starts one on retry', async () => {
			const { store, findByTestId, getByTestId, queryByTestId } =
				await commitWithFailingStart(null);

			expect(await findByTestId('instance-ai-test-agent-examples-run-failed')).toBeInTheDocument();
			expect(showErrorMock).toHaveBeenCalled();
			expect(store.deleteDraftDataset).not.toHaveBeenCalled();

			vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'retried-run' } as never);
			await userEvent.setup().click(getByTestId('instance-ai-test-agent-examples-retry-run'));

			await waitFor(() =>
				expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'retried-run'),
			);
			expect(queryByTestId('instance-ai-test-agent-examples-run-failed')).not.toBeInTheDocument();
		});

		it('does not start a second run when a retry finds the first one landed late', async () => {
			const { store, findByTestId, getByTestId } = await commitWithFailingStart(null);
			await findByTestId('instance-ai-test-agent-examples-run-failed');

			vi.spyOn(store, 'resolveLatestRunId').mockResolvedValue('late-run');
			const startRun = vi.spyOn(store, 'startRun').mockClear();
			await userEvent.setup().click(getByTestId('instance-ai-test-agent-examples-retry-run'));

			await waitFor(() =>
				expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'late-run'),
			);
			expect(startRun).not.toHaveBeenCalled();
		});
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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

	it('does not generate the suite twice on a rapid double click of "Check harder cases"', async () => {
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
			const el = getByTestId('instance-ai-test-agent-preview-check-harder');
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
			verdict: AgentEvalVerdict;
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
			verdict: PASS_VERDICT,
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
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

	describe('the first check card', () => {
		const SKIPPED_VERDICT: AgentEvalVerdict = { status: 'skipped', outcome: null, reasoning: null };

		const renderCard = async (overrides: Parameters<typeof mockPreviewRun>[1] = {}) => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store, overrides);
			const view = renderComponent();
			await view.findByTestId('instance-ai-test-agent-preview-first-check');
			return { store, user: userEvent.setup(), ...view };
		};

		it('reports a passed check with the example message and what the judge found', async () => {
			const { getByTestId, getByText, queryByTestId } = await renderCard();

			expect(getByTestId('instance-ai-test-agent-preview-first-check-title')).toHaveTextContent(
				'First check passed',
			);
			expect(getByText('Example message')).toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-preview-example')).toHaveTextContent(
				'“Summarize the thread”',
			);
			expect(getByText('What we found')).toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-preview-findings')).toHaveTextContent(
				'It named the ticket, the customer and the priority.',
			);
			expect(
				getByText('We tried one everyday message. Harder ones are ready when you are.'),
			).toBeInTheDocument();
			expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toHaveTextContent(
				'Check harder cases',
			);
			expect(getByTestId('instance-ai-test-agent-preview-later')).toHaveTextContent('Later');
			expect(queryByTestId('instance-ai-test-agent-preview-needs-work')).not.toBeInTheDocument();
		});

		it('shows the full conversation only after the icon button is pressed, and hides it again', async () => {
			const { user, getByTestId, queryByText, findByText } = await renderCard();
			const toggle = getByTestId('instance-ai-test-agent-preview-toggle-conversation');

			expect(queryByText('Ticket #48219 is a P1 SSO outage.')).not.toBeInTheDocument();
			expect(toggle).toHaveAttribute('aria-expanded', 'false');
			expect(toggle).toHaveAccessibleName('Show the conversation');

			await user.click(toggle);

			expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
			expect(toggle).toHaveAttribute('aria-expanded', 'true');
			expect(toggle).toHaveAccessibleName('Hide the conversation');

			await user.click(toggle);

			expect(queryByText('Ticket #48219 is a P1 SSO outage.')).not.toBeInTheDocument();
		});

		it('dismisses on "Later" without confirming', async () => {
			const { user, getByTestId, emitted } = await renderCard();

			await user.click(getByTestId('instance-ai-test-agent-preview-later'));

			expect(emitted().dismiss).toEqual([[]]);
			expect(emitted().confirm).toBeUndefined();
		});

		it('confirms on "Check harder cases" and generates the rest of the suite', async () => {
			const { user, store, getByTestId, emitted, findByTestId } = await renderCard();
			const generateDraftCases = vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
			});

			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));

			expect(emitted().confirm).toEqual([[]]);
			expect(await findByTestId('instance-ai-test-agent-examples-check-agent')).toBeInTheDocument();
			expect(generateDraftCases).toHaveBeenCalledWith(
				'project-1',
				'agent-1',
				expect.objectContaining({ count: 10, save: false, exampleInput: 'Summarize the thread' }),
			);
		});

		describe('when the judge failed the answer', () => {
			it('says the check needs work, with the judge’s reasoning, and offers to fix it', async () => {
				const { getByTestId, queryByTestId } = await renderCard({ verdict: FAIL_VERDICT });

				expect(getByTestId('instance-ai-test-agent-preview-first-check-title')).toHaveTextContent(
					'First check needs work',
				);
				expect(getByTestId('instance-ai-test-agent-preview-findings')).toHaveTextContent(
					'It never named the ticket.',
				);
				expect(getByTestId('instance-ai-test-agent-preview-needs-work')).toHaveTextContent(
					'Fix this check',
				);
				expect(getByTestId('instance-ai-test-agent-preview-later')).toBeInTheDocument();
				// A real fail is the cue to fix the check first, not to move on.
				expect(
					queryByTestId('instance-ai-test-agent-preview-check-harder'),
				).not.toBeInTheDocument();
			});

			it('opens the correction flow on "Fix this check"', async () => {
				const { user, getByTestId, findByTestId } = await renderCard({ verdict: FAIL_VERDICT });

				await user.click(getByTestId('instance-ai-test-agent-preview-needs-work'));

				expect(
					await findByTestId('instance-ai-test-agent-preview-sample-input'),
				).toBeInTheDocument();
			});
		});

		// Without a completed pass nothing can be called "passed" — including when
		// the judge simply could not grade the answer.
		describe.each([
			['the judge errored', UNGRADED_VERDICT],
			['there was no rule to grade against', SKIPPED_VERDICT],
		])('when %s', (_label, verdict) => {
			it('never says "passed", and shows a neutral note in place of findings', async () => {
				const { getByTestId } = await renderCard({ verdict });

				expect(getByTestId('instance-ai-test-agent-preview-first-check-title')).toHaveTextContent(
					'First check needs work',
				);
				expect(getByTestId('instance-ai-test-agent-preview-findings')).toHaveTextContent(
					'We couldn’t check this answer against its rule.',
				);
			});

			it('still lets the user go on to harder cases, since nothing actually failed', async () => {
				const { user, store, getByTestId, emitted, findByTestId } = await renderCard({ verdict });
				vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
					cases: [{ input: 'a', whatToCheck: 'b', scenario: 'Vague' }],
				});

				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toHaveTextContent(
					'Check harder cases anyway',
				);
				await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));

				expect(emitted().confirm).toEqual([[]]);
				expect(
					await findByTestId('instance-ai-test-agent-examples-check-agent'),
				).toBeInTheDocument();
			});
		});
	});

	describe('"Needs work" / sample-input guards', () => {
		it('ignores a stray "Needs work" click from a stale button reference after confirming', async () => {
			const store = useAgentEvalsStore();
			// Ungraded, so both "Fix this check" and "Check harder cases anyway" show.
			mockPreviewRun(store, { verdict: UNGRADED_VERDICT });
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			const checkHarder = getByTestId('instance-ai-test-agent-preview-check-harder');
			const needsWork = getByTestId('instance-ai-test-agent-preview-needs-work');

			// Both buttons are still the same DOM nodes in this tick — Vue hasn't
			// patched the phase change in yet. A stray second click on the old
			// "Needs work" node must not divert the already-confirmed flow to the
			// sample-input prompt.
			await fireEvent.click(checkHarder);
			await fireEvent.click(needsWork);

			expect(await findByTestId('instance-ai-test-agent-examples-check-agent')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-test-agent-preview-sample-input')).not.toBeInTheDocument();
		});

		it('does not submit a whitespace-only correction via the keyboard shortcut', async () => {
			const store = useAgentEvalsStore();
			const previewRun = mockPreviewRun(store, { verdict: FAIL_VERDICT });

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

	describe('automated grading', () => {
		// A case whose rule says "always fail": the agent's execution succeeds
		// (status: 'success'), but the judge graded the output against that rule
		// and called it a fail. The row must read as "work" ("needs a look"), not
		// "fail" ("couldn't finish") — those are different problems — and the
		// judge's reasoning shows in the full eval view.
		it('renders a graded-fail case as "work"', async () => {
			const store = useAgentEvalsStore();
			mockPreviewRun(store);
			vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
				cases: [
					{ input: 'Can I pay by invoice?', whatToCheck: 'Must always refuse.', scenario: 'Vague' },
				],
			});
			mockCommit(store, {
				rows: [{ rowId: 1, input: 'Can I pay by invoice?', whatToCheck: 'Must always refuse.' }],
			});
			vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
			vi.spyOn(store, 'getReview').mockReturnValue({
				run: { status: 'completed' } as never,
				results: [
					{
						id: 'res-1',
						sourceRowId: '1',
						status: 'success',
						input: { input: 'Can I pay by invoice?', criteria: 'Must always refuse.' },
						output: { finalText: 'Sure, invoice payment works for this order.' },
						verdict: {
							status: 'completed',
							outcome: 'fail',
							reasoning: 'The agent agreed to invoice payment instead of refusing.',
						},
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
				expect(getByTestId('instance-ai-test-agent-preview-check-harder')).toBeEnabled(),
			);
			await user.click(getByTestId('instance-ai-test-agent-preview-check-harder'));
			await findByTestId('instance-ai-test-agent-examples-check-agent');
			await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

			// Settles immediately (the mocked run is already "completed").
			expect(await findByText('0 of 1 went well, 1 need work')).toBeInTheDocument();
			await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));
			const row = await findByTestId('instance-ai-test-agent-examples-case-1');

			// "Needs work", not "Couldn't finish" — the avatar's own accessible
			// label is what distinguishes a graded fail from an execution error.
			expect(within(row).getByRole('img', { name: /Needs work/ })).toBeInTheDocument();
			expect(within(row).queryByRole('img', { name: /Couldn't finish/ })).not.toBeInTheDocument();
		});
	});
});
