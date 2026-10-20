import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import type { AgentEvalVerdict } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import type { AgentEvalResultRecord } from '@/features/agents/agentEvals.types';
import InstanceAiTestAgentPreviewPanel from '../components/InstanceAiTestAgentPreviewPanel.vue';

const showErrorMock = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

const { getAgentConfigMock, updateAgentConfigMock } = vi.hoisted(() => ({
	getAgentConfigMock: vi.fn(),
	updateAgentConfigMock: vi.fn(),
}));
vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgentConfig: getAgentConfigMock,
	updateAgentConfig: updateAgentConfigMock,
}));

const target = { agentId: 'agent-1', projectId: 'project-1' };

const TITLE = 'instance-ai-first-checks-title';
const ROW = 'instance-ai-first-checks-row';
const RUN = 'instance-ai-first-checks-run';
const TRY = 'instance-ai-first-checks-try';
const FIX = 'instance-ai-first-checks-fix';
const UNDO = 'instance-ai-first-checks-undo';
const NOTE = 'instance-ai-first-checks-change-note';

const CASES = [1, 2, 3].map((n) => ({
	input: `Sample message ${n}`,
	whatToCheck: `Rule ${n}`,
	scenario: 'Vague',
}));

const PASS: AgentEvalVerdict = { status: 'completed', outcome: 'pass', reasoning: 'Fine.' };
const FAIL = (n: number): AgentEvalVerdict => ({
	status: 'completed',
	outcome: 'fail',
	reasoning: `It broke rule ${n}. More detail.`,
	suggestion: `Follow rule ${n}.`,
});

const result = (n: number, verdict: AgentEvalVerdict | null): AgentEvalResultRecord => ({
	id: `result-${n}`,
	runId: 'run-1',
	sourceRowId: String(n),
	runIndex: n,
	status: verdict ? 'success' : 'running',
	input: { input: `Sample message ${n}`, criteria: `Rule ${n}` },
	output: verdict ? { finalText: `Reply ${n}` } : null,
	toolCalls: null,
	metrics: null,
	verdict,
	runAt: null,
	completedAt: null,
	errorCode: null,
	errorDetails: null,
	createdAt: '',
	updatedAt: '',
});

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

/** Backs the store's run reads with refs, so the panel re-renders as they change. */
function setupStore() {
	const store = mockedStore(useAgentEvalsStore);
	const results = ref<AgentEvalResultRecord[]>([]);
	const inFlight = ref(false);
	store.generateDraftCases.mockResolvedValue({ cases: CASES } as never);
	store.createDraftDataset.mockResolvedValue({
		datasetId: 'dataset-1',
		dataTableId: 'table-1',
		columnMapping: { input: 'input', criteria: 'criteria' },
	});
	store.createCase.mockResolvedValue({} as never);
	store.deleteDraftDataset.mockResolvedValue(undefined);
	store.startRun.mockResolvedValue({ id: 'run-1' } as never);
	store.getReview.mockImplementation(() => ({
		run: null,
		results: results.value,
		resultsCount: results.value.length,
		ratingsByResultId: {},
		pendingByResultId: {},
		draftsByResultId: {},
		counts: null,
		loading: false,
		loadingMore: false,
	}));
	store.isRunInFlight.mockImplementation(() => inFlight.value);
	return { store, results, inFlight };
}

async function runChecks(
	user: ReturnType<typeof userEvent.setup>,
	findByTestId: (id: string) => Promise<HTMLElement>,
) {
	await user.click(await findByTestId(RUN));
}

describe('InstanceAiTestAgentPreviewPanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		showErrorMock.mockClear();
		getAgentConfigMock.mockReset();
		updateAgentConfigMock.mockReset();
	});

	it('drafts three checks and offers them, without running anything', async () => {
		const { store } = setupStore();

		const { getByTestId, findByTestId, getAllByTestId, getByText } = renderComponent();

		expect(getByTestId(TITLE)).toHaveTextContent('Preparing checks for your agent…');
		expect(await findByTestId(RUN)).toHaveTextContent('Run 3 checks');
		expect(store.generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', {
			count: 3,
			save: false,
		});
		expect(getByTestId(TITLE)).toHaveTextContent('Your agent is ready');
		expect(
			getByText('Want me to check it? I’d send your agent three sample messages to make sure it:'),
		).toBeInTheDocument();
		const rows = getAllByTestId(ROW);
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent('Rule 1');
		expect(rows[0]).toHaveTextContent('“Sample message 1”');
		expect(rows[0]).toHaveAttribute('data-status', 'idle');
		expect(getByTestId(TRY)).toBeInTheDocument();
		expect(store.startRun).not.toHaveBeenCalled();
		expect(store.previewRun).not.toHaveBeenCalled();
	});

	it('toasts and dismisses when the checks cannot be drafted', async () => {
		const { store } = setupStore();
		store.generateDraftCases.mockRejectedValueOnce(new Error('boom'));

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toHaveLength(1));
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('saves the checks as a dataset and runs them, showing each row as running', async () => {
		const { store, inFlight } = setupStore();
		inFlight.value = true;
		const user = userEvent.setup();
		const { findByTestId, getByTestId, getAllByTestId, emitted, unmount } = renderComponent();

		await runChecks(user, findByTestId);

		await waitFor(() =>
			expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-1'),
		);
		expect(emitted().confirm).toHaveLength(1);
		expect(store.createCase).toHaveBeenCalledTimes(3);
		expect(store.createCase).toHaveBeenCalledWith(
			'project-1',
			expect.objectContaining({ datasetId: 'dataset-1' }),
			{ input: 'Sample message 1', whatToCheck: 'Rule 1' },
		);
		expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
		expect(getByTestId(TITLE)).toHaveTextContent('Running 3 checks: 0 of 3 done…');
		expect(getAllByTestId(ROW)[0]).toHaveTextContent('Running…');
		unmount();
	});

	it('deletes the dataset and offers the checks again when they cannot be saved', async () => {
		const { store } = setupStore();
		store.createCase.mockRejectedValueOnce(new Error('nope'));
		const user = userEvent.setup();
		const { findByTestId } = renderComponent();

		await runChecks(user, findByTestId);

		await waitFor(() =>
			expect(store.deleteDraftDataset).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-1'),
		);
		expect(store.startRun).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
		expect(await findByTestId(RUN)).toBeInTheDocument();
	});

	it('says how many need work, with the judge’s first sentence or the reply on each row', async () => {
		const { results } = setupStore();
		const user = userEvent.setup();
		const { findByTestId, getByTestId, getAllByTestId } = renderComponent();
		await runChecks(user, findByTestId);
		results.value = [result(1, FAIL(1)), result(2, PASS), result(3, FAIL(3))];

		expect(await findByTestId(FIX)).toHaveTextContent('Fix both');
		expect(getByTestId(TITLE)).toHaveTextContent('2 of 3 checks need work');
		const rows = getAllByTestId(ROW);
		expect(rows[0]).toHaveTextContent('It broke rule 1.');
		expect(rows[0]).not.toHaveTextContent('More detail.');
		expect(rows[1]).toHaveTextContent('Reply 2');
	});

	it('says "Fix it" for one failing check', async () => {
		const { results } = setupStore();
		const user = userEvent.setup();
		const { findByTestId, getByTestId } = renderComponent();
		await runChecks(user, findByTestId);
		results.value = [result(1, FAIL(1)), result(2, PASS), result(3, PASS)];

		expect(await findByTestId(FIX)).toHaveTextContent('Fix it');
		expect(getByTestId(TITLE)).toHaveTextContent('1 of 3 checks needs work');
	});

	it('says every check passes and offers to try the agent', async () => {
		const { results } = setupStore();
		const user = userEvent.setup();
		const { findByTestId, getByTestId, queryByTestId, emitted } = renderComponent();
		await runChecks(user, findByTestId);
		results.value = [result(1, PASS), result(2, PASS), result(3, PASS)];

		await waitFor(() => expect(getByTestId(TITLE)).toHaveTextContent('All 3 checks pass'));
		expect(queryByTestId(FIX)).not.toBeInTheDocument();

		await user.click(getByTestId(TRY));
		expect(emitted()['try-agent']).toHaveLength(1);
	});

	it('fixes every failing check in one rewrite, and can undo it', async () => {
		const { store, results } = setupStore();
		const before = { name: 'Agent', instructions: 'Be brief.' };
		getAgentConfigMock
			.mockResolvedValueOnce({ config: before, configHash: 'hash-1' })
			.mockResolvedValueOnce({ config: { ...before, instructions: 'New.' }, configHash: 'hash-2' });
		store.applySuggestions.mockImplementation(async () => {
			results.value = [result(1, PASS), result(2, PASS), result(3, PASS)];
			return { configHash: 'hash-2', results: [] };
		});
		updateAgentConfigMock.mockResolvedValue({ config: before, configHash: 'hash-3' });
		const user = userEvent.setup();
		const { findByTestId, getByTestId } = renderComponent();
		await runChecks(user, findByTestId);
		results.value = [result(1, FAIL(1)), result(2, PASS), result(3, FAIL(3))];

		await user.click(await findByTestId(FIX));

		expect(store.applySuggestions).toHaveBeenCalledWith('project-1', 'agent-1', [
			'result-1',
			'result-3',
		]);
		expect(await findByTestId(NOTE)).toHaveTextContent('Updated your instructions');
		expect(getByTestId(TITLE)).toHaveTextContent('All 3 checks pass');

		await user.click(getByTestId(UNDO));

		await waitFor(() =>
			expect(updateAgentConfigMock).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				before,
				'hash-2',
			),
		);
		await waitFor(() => expect(store.startRun).toHaveBeenCalledTimes(2));
		expect(await findByTestId(NOTE)).toHaveTextContent('Put your instructions back');
	});

	it('opens the chat preview on "Try it yourself" from the offer', async () => {
		setupStore();
		const user = userEvent.setup();
		const { findByTestId, emitted } = renderComponent();

		await user.click(await findByTestId(TRY));

		expect(emitted().confirm).toHaveLength(1);
		expect(emitted()['try-agent']).toHaveLength(1);
	});
});
