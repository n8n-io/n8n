import { configure, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { agentsEventBus } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultRecord, AgentEvalResultStatus } from '../agentEvals.types';
import AgentEvalChecksPanel from '../components/AgentEvalChecksPanel.vue';

configure({ testIdAttribute: 'data-testid' });

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

// The rows have their own suite; this one is about the panel around them.
// Typed (not array) prop declarations so a bare `hide-revise` attribute
// coerces to boolean `true`, same as the real component the mock stands in for.
vi.mock('../components/AgentEvalTryRow.vue', () => ({
	default: {
		name: 'AgentEvalTryRow',
		props: {
			status: {},
			date: {},
			input: {},
			output: {},
			label: {},
			testId: {},
			disabled: { type: Boolean },
			hideRevise: { type: Boolean },
			focused: { type: Boolean },
			feedback: { type: Boolean },
			rating: {},
		},
		emits: [
			'save-check',
			'looks-right',
			'looks-wrong',
			'rerun-check',
			'save-what-to-check',
			'delete-check',
		],
		// A plain, testId-free button: a testid built from the row's own (which
		// starts with the same "agent-eval-check-" every row testid shares) would
		// match every row-counting `getAllByTestId(/agent-eval-check-/)` query in
		// this file. Tests scope into it with `within(row)` instead.
		template: `<div
			:data-testid="testId"
			:data-status="status"
			:data-date="date"
			:data-disabled="disabled"
			:data-hide-revise="hideRevise"
			:data-focused="focused"
			:data-feedback="feedback"
			:data-rating="rating"
		>
			{{ input }}
			<button @click="$emit('looks-right')">looks right</button>
			<button @click="$emit('looks-wrong', 'It should decline.')">looks wrong</button>
			<button @click="$emit('rerun-check')">run check</button>
			<button @click="$emit('save-what-to-check', 'Mentions the refund window.')">save rule</button>
			<button @click="$emit('delete-check')">delete check</button>
		</div>`,
	},
}));

// The add-check panel has its own suite; here only how the checks view wires it.
// `addCheckPanelMounts` counts instances: a remount would draft the prepared cases again.
const { addCheckPanelMounts } = vi.hoisted(() => ({ addCheckPanelMounts: { count: 0 } }));
vi.mock('../components/AgentEvalAddCheckPanel.vue', () => ({
	default: {
		name: 'AgentEvalAddCheckPanel',
		setup() {
			addCheckPanelMounts.count++;
		},
		props: {
			projectId: {},
			agentId: {},
			caseSource: {},
			disabled: { type: Boolean },
			busy: { type: Boolean },
		},
		emits: ['close', 'added'],
		template: `<div
			data-testid="add-check-panel-stub"
			:data-busy="busy"
			:data-disabled="disabled"
			:data-dataset="caseSource && caseSource.datasetId"
		>
			<button @click="$emit('close')">close panel</button>
			<button @click="$emit('added')">added a check</button>
		</div>`,
	},
}));

const result = (id: string, status: AgentEvalResultStatus): AgentEvalResultRecord => ({
	id,
	runId: 'run-1',
	sourceRowId: `row-${id}`,
	runIndex: 0,
	status,
	input: { input: `request ${id}` },
	output: status === 'new' ? null : { finalText: `answer ${id}` },
	toolCalls: null,
	metrics: null,
	verdict: null,
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:00:30.000Z',
	errorCode: null,
	errorDetails: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:30.000Z',
});

const renderComponent = createComponentRenderer(AgentEvalChecksPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1', runId: 'run-1' },
});

const render = (
	review: {
		results?: AgentEvalResultRecord[];
		resultsCount?: number;
		loadingMore?: boolean;
		disabled?: boolean;
		focusedResultId?: string;
	} = {},
	inFlight = false,
) => {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();

	vi.mocked(store.getReview).mockReturnValue({
		run: null,
		results: review.results ?? [],
		resultsCount: review.resultsCount ?? (review.results ?? []).length,
		ratingsByResultId: {},
		pendingByResultId: {},
		draftsByResultId: {},
		counts: null,
		loading: false,
		loadingMore: review.loadingMore ?? false,
	});
	vi.mocked(store.isRunInFlight).mockReturnValue(inFlight);
	vi.mocked(store.isStartingRun).mockReturnValue(false);
	vi.mocked(store.consumeFocusedEvalResult).mockReturnValue(review.focusedResultId ?? null);

	return {
		...renderComponent({
			pinia,
			props: { disabled: review.disabled },
		}),
		store,
	};
};

/**
 * Mutable, growable mock: each `loadMoreResults` call grows a `ref` that
 * `getReview` reads from. It has to be a real ref — the component's `review`
 * computed only re-evaluates `getReview()` when one of its reads touches an
 * actual reactive dependency; a plain mutable variable closed over by
 * `mockImplementation` would update the data but never trigger a re-render.
 */
const renderWithGrowablePage = (allResults: AgentEvalResultRecord[], pageSize: number) => {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();

	const loadedCount = ref(pageSize);
	vi.mocked(store.getReview).mockImplementation(() => ({
		run: null,
		results: allResults.slice(0, loadedCount.value),
		resultsCount: allResults.length,
		ratingsByResultId: {},
		pendingByResultId: {},
		draftsByResultId: {},
		counts: null,
		loading: false,
		loadingMore: false,
	}));
	vi.mocked(store.isRunInFlight).mockReturnValue(false);
	vi.mocked(store.isStartingRun).mockReturnValue(false);
	vi.mocked(store.loadMoreResults).mockImplementation(async () => {
		loadedCount.value = Math.min(loadedCount.value + pageSize, allResults.length);
	});

	return { ...renderComponent({ pinia }), store };
};

describe('AgentEvalChecksPanel', () => {
	beforeEach(() => {
		addCheckPanelMounts.count = 0;
		vi.clearAllMocks();
	});

	it('opens the run on mount', () => {
		const { store } = render();

		expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
	});

	it('focuses the row the eval view was opened on, and claims the request once', () => {
		const { getByTestId, store } = render({
			results: [result('c1', 'success'), result('c2', 'success')],
			focusedResultId: 'c2',
		});

		expect(getByTestId('agent-eval-check-c2')).toHaveAttribute('data-focused', 'true');
		expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-focused', 'false');
		expect(store.consumeFocusedEvalResult).toHaveBeenCalledWith('agent-1');
	});

	it('focuses no row when the eval view was opened without a target', () => {
		const { getByTestId } = render({ results: [result('c1', 'success')] });

		expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-focused', 'false');
	});

	// A started run ("Run all checks", an added check) has an empty review until its
	// first read lands. Drawing from it blanks the view and makes everything below jump.
	describe('when a new run starts', () => {
		const loadedReview = (results: AgentEvalResultRecord[], run: object | null = {}) => ({
			run: run as never,
			results,
			resultsCount: results.length,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		it('keeps the previous run’s rows on screen until the new run has loaded', async () => {
			const first = loadedReview([result('c1', 'success'), result('c2', 'error')]);
			const { getAllByTestId, queryAllByTestId, queryByTestId, rerender, store } = render({
				results: first.results,
			});
			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);

			// Run 2 exists, but its review has not been read yet.
			vi.mocked(store.getReview).mockImplementation((runId: string) =>
				runId === 'run-1' ? first : loadedReview([], null),
			);
			await rerender({ runId: 'run-2' });

			expect(queryAllByTestId(/agent-eval-check-/)).toHaveLength(2);
			expect(queryByTestId('agent-eval-checks-filter-all')).toBeInTheDocument();
		});

		// The store state is reactive in the app, so a run's review fills in under the
		// same run id. A ref stands in for it here.
		it('switches to the new run’s rows once its review fills in, without another run change', async () => {
			const first = loadedReview([result('c1', 'success'), result('c2', 'error')]);
			const live = ref(loadedReview([], null));
			const { getAllByTestId, queryByTestId, rerender, store } = render({ results: first.results });
			vi.mocked(store.getReview).mockImplementation((runId: string) =>
				runId === 'run-1' ? first : live.value,
			);
			await rerender({ runId: 'run-2' });
			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);

			live.value = loadedReview([result('n1', 'new'), result('n2', 'new'), result('n3', 'new')]);

			await vi.waitFor(() => expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(3));
			expect(queryByTestId('agent-eval-check-c1')).not.toBeInTheDocument();
		});

		// Acting on a result the current run no longer holds would change the dataset
		// but leave the new run's copy on screen.
		it('locks the retained rows and the add panel until the new run has loaded', async () => {
			const first = loadedReview([result('c1', 'success'), result('c2', 'error')]);
			const live = ref(loadedReview([], null));
			const { getByTestId, getAllByTestId, rerender, store } = render({ results: first.results });
			expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-disabled', 'false');
			vi.mocked(store.getReview).mockImplementation((runId: string) =>
				runId === 'run-1' ? first : live.value,
			);
			await rerender({ runId: 'run-2' });

			for (const row of getAllByTestId(/agent-eval-check-/)) {
				expect(row).toHaveAttribute('data-disabled', 'true');
			}

			live.value = loadedReview([result('n1', 'new')]);

			await vi.waitFor(() =>
				expect(getByTestId('agent-eval-check-n1')).toHaveAttribute('data-disabled', 'false'),
			);
		});

		it('drops the retained rows, and says so, when the new run cannot be loaded', async () => {
			const first = loadedReview([result('c1', 'success'), result('c2', 'error')]);
			const { getAllByTestId, queryAllByTestId, rerender, store } = render({
				results: first.results,
			});
			vi.mocked(store.getReview).mockImplementation((runId: string) =>
				runId === 'run-1' ? first : loadedReview([], null),
			);
			vi.mocked(store.openRun).mockRejectedValueOnce(new Error('offline'));
			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);

			await rerender({ runId: 'run-2' });

			await vi.waitFor(() => expect(showError).toHaveBeenCalled());
			expect(queryAllByTestId(/agent-eval-check-/)).toHaveLength(0);
		});
	});

	it('renders one row per result', () => {
		const { getAllByTestId } = render({
			results: [result('c1', 'success'), result('c2', 'error')],
		});

		expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);
	});

	it('renders a successful case with a graded fail verdict as "work", counted as needs-work', () => {
		const gradedFail = {
			...result('judged-1', 'success'),
			verdict: { status: 'completed' as const, outcome: 'fail' as const, reasoning: 'Off-task.' },
		};
		const { getByTestId } = render({ results: [gradedFail] });

		expect(getByTestId('agent-eval-check-judged-1')).toHaveAttribute('data-status', 'work');
		expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent('1');
	});

	it('renders a successful case with no verdict (ungraded) as "pass", same as before judging shipped', () => {
		const ungraded = result('ungraded-1', 'success');
		const { getByTestId, queryByTestId } = render({ results: [ungraded] });

		expect(getByTestId('agent-eval-check-ungraded-1')).toHaveAttribute('data-status', 'pass');
		expect(queryByTestId('agent-eval-checks-filter-needs-work')).not.toBeInTheDocument();
	});

	it('sorts needs-work rows before passing ones', () => {
		const { getAllByTestId } = render({
			results: [result('pass-1', 'success'), result('fail-1', 'error')],
		});

		const rows = getAllByTestId(/agent-eval-check-/);
		expect(rows[0]).toHaveAttribute('data-testid', 'agent-eval-check-fail-1');
		expect(rows[1]).toHaveAttribute('data-testid', 'agent-eval-check-pass-1');
	});

	it('counts needs-work and pass pills off the results', () => {
		const { getByTestId } = render({
			results: [
				result('pass-1', 'success'),
				result('pass-2', 'success'),
				result('fail-1', 'error'),
				result('cancel-1', 'cancelled'),
			],
		});

		expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent('2');
		expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('2');
		expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('4');
	});

	it('counts only finished checks in the status pills, and every check in "All"', () => {
		const { getByTestId } = render(
			{
				results: [
					result('pass-1', 'success'),
					result('fail-1', 'error'),
					result('running-1', 'running'),
					result('new-1', 'new'),
				],
			},
			true,
		);

		expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent('1');
		expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('1');
		expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('4');
	});

	it('shows no time on a running check', () => {
		const { getByTestId } = render(
			{ results: [result('running-1', 'running'), result('pass-1', 'success')] },
			true,
		);

		expect(getByTestId('agent-eval-check-running-1')).not.toHaveAttribute('data-date');
		expect(getByTestId('agent-eval-check-pass-1')).toHaveAttribute(
			'data-date',
			'2026-01-01T00:00:00.000Z',
		);
	});

	describe('verdict line', () => {
		it('sums up the shown run above the filters', () => {
			const { getByTestId } = render({
				results: [
					{
						...result('c1', 'success'),
						verdict: {
							status: 'completed',
							outcome: 'fail',
							reasoning: 'It answered off-topic. It should decline.',
						},
					},
					result('c2', 'success'),
				],
			});

			expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent(
				'It answered off-topic.',
			);
		});

		it('hands every failing check to the Assistant from "Fix with Assistant"', async () => {
			const user = userEvent.setup();
			const emit = vi.spyOn(agentsEventBus, 'emit');
			const failedResult = (id: string) => ({
				...result(id, 'success' as const),
				verdict: {
					status: 'completed' as const,
					outcome: 'fail' as const,
					reasoning: `Reason ${id}.`,
				},
			});
			const { getByTestId } = render({
				results: [failedResult('c1'), failedResult('c2'), result('c3', 'success')],
			});

			await user.click(getByTestId('agent-eval-verdict-fix'));

			const request = emit.mock.calls.find(([event]) => event === 'evalFixRequested')?.[1];
			expect(request).toMatchObject({ projectId: 'project-1', agentId: 'agent-1', checkCount: 3 });
			const prompt = (request as { prompt: string }).prompt;
			expect(prompt).toContain('Fix the 2 checks that need work.');
			expect(prompt).toContain('Reason c1.');
			expect(prompt).toContain('Reason c2.');
			expect(prompt).not.toContain('request c3');
			emit.mockRestore();
		});

		it('hides "Fix with Assistant" while the Assistant has the fix', () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.getReview).mockReturnValue({
				run: null,
				results: [
					{
						...result('c1', 'success'),
						verdict: { status: 'completed', outcome: 'fail', reasoning: 'Off-task.' },
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
			vi.mocked(store.isRunInFlight).mockReturnValue(false);
			vi.mocked(store.consumeFocusedEvalResult).mockReturnValue(null);
			vi.mocked(store.isEvalFixInAssistant).mockReturnValue(true);

			const { queryByTestId, getByTestId } = renderComponent({ pinia });

			expect(getByTestId('agent-eval-verdict-details')).toBeInTheDocument();
			expect(queryByTestId('agent-eval-verdict-fix')).not.toBeInTheDocument();
		});

		it('is hidden while there is no result and no run', () => {
			const { queryByTestId } = render({ results: [] });

			expect(queryByTestId('agent-eval-verdict-line')).not.toBeInTheDocument();
		});

		it('shows progress while a run is in flight', () => {
			const { getByTestId } = render(
				{ results: [result('c1', 'success'), result('c2', 'running')] },
				true,
			);

			expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent(
				'Checking: 1 of 2 done…',
			);
		});
	});

	describe('pill visibility', () => {
		// When every check has the same status, a status option and "All" would
		// list the same rows, so only one summary option shows.
		it('shows one summary option when everything passes', () => {
			const { queryByTestId, getByTestId } = render({
				results: [result('pass-1', 'success'), result('pass-2', 'success')],
			});

			expect(queryByTestId('agent-eval-checks-filter-needs-work')).not.toBeInTheDocument();
			expect(queryByTestId('agent-eval-checks-filter-all')).not.toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('All 2 passed');
		});

		it('shows one summary option when everything needs work', () => {
			const { queryByTestId, getByTestId } = render({
				results: [result('fail-1', 'error'), result('fail-2', 'error')],
			});

			expect(queryByTestId('agent-eval-checks-filter-pass')).not.toBeInTheDocument();
			expect(queryByTestId('agent-eval-checks-filter-all')).not.toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent(
				'All 2 need work',
			);
		});

		it('shows all three pills once both statuses are present', () => {
			const { getByTestId } = render({
				results: [result('pass-1', 'success'), result('fail-1', 'error')],
			});

			expect(getByTestId('agent-eval-checks-filter-needs-work')).toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-pass')).toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-all')).toBeInTheDocument();
		});

		it('hides the whole filter row when there are no results yet', () => {
			const { queryByTestId } = render({ results: [] });

			expect(queryByTestId('agent-eval-checks-filter-all')).not.toBeInTheDocument();
		});
	});

	describe('status filter', () => {
		const renderFour = () =>
			render({
				results: [
					result('pass-1', 'success'),
					result('pass-2', 'success'),
					result('fail-1', 'error'),
					result('work-1', 'cancelled'),
				],
			});

		it('shows every row under "All"', () => {
			const { getAllByTestId } = renderFour();

			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(4);
		});

		it('filters down to only passing rows', async () => {
			const user = userEvent.setup();
			const { getAllByTestId, getByTestId } = renderFour();

			await user.click(getByTestId('agent-eval-checks-filter-pass'));

			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);
		});

		it('filters down to only needs-work rows', async () => {
			const user = userEvent.setup();
			const { getAllByTestId, getByTestId } = renderFour();

			await user.click(getByTestId('agent-eval-checks-filter-needs-work'));

			expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);
		});

		it('shows the filter as one segment control, with the chosen option checked', async () => {
			const user = userEvent.setup();
			const { getAllByRole, getByTestId } = renderFour();
			const segment = (key: string) =>
				getByTestId(`agent-eval-checks-filter-${key}`).closest('[role="radio"]');

			expect(getAllByRole('radio')).toHaveLength(3);
			expect(segment('all')).toHaveAttribute('aria-checked', 'true');

			await user.click(getByTestId('agent-eval-checks-filter-pass'));

			expect(segment('pass')).toHaveAttribute('aria-checked', 'true');
			expect(segment('all')).toHaveAttribute('aria-checked', 'false');
		});

		it('shows a status avatar on each status option, and none on "All"', () => {
			const { getByTestId } = renderFour();

			expect(
				within(getByTestId('agent-eval-checks-filter-needs-work')).getByRole('img'),
			).toBeInTheDocument();
			expect(
				within(getByTestId('agent-eval-checks-filter-pass')).getByRole('img'),
			).toBeInTheDocument();
			expect(
				within(getByTestId('agent-eval-checks-filter-all')).queryByRole('img'),
			).not.toBeInTheDocument();
		});
	});

	it('emits rerun when "Run all checks" is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = render({ results: [result('c1', 'success')] });

		await user.click(getByTestId('agent-eval-checks-run-all'));

		expect(emitted('rerun')).toBeTruthy();
	});

	it('reruns just that one result when a row\'s "Run check" is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId, store } = render({
			results: [result('c1', 'success'), result('c2', 'success')],
		});

		await user.click(within(getByTestId('agent-eval-check-c1')).getByText('run check'));

		expect(store.rerunResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1');
		expect(store.rerunResult).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'c2');
	});

	// There is no editable case row here — only the result's own snapshot — so
	// saving the rule reruns through the same single-result primitive, with the
	// edited text bundled into the request rather than a separate write.
	it('reruns that one result with the edited rule when "save rule" is emitted', async () => {
		const user = userEvent.setup();
		const { getByTestId, store } = render({
			results: [result('c1', 'success'), result('c2', 'success')],
		});

		await user.click(within(getByTestId('agent-eval-check-c1')).getByText('save rule'));

		expect(store.rerunResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1', {
			whatToCheck: 'Mentions the refund window.',
		});
	});

	describe('"Looks right" and "Looks wrong"', () => {
		const failed = {
			...result('c1', 'success'),
			input: { input: 'What is the weather?', criteria: 'Declines off-topic requests' },
			verdict: {
				status: 'completed' as const,
				outcome: 'fail' as const,
				reasoning: 'It answered the weather question.',
			},
		};

		it('asks every row for feedback', () => {
			const { getByTestId } = render({ results: [result('c1', 'success')] });

			expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-feedback', 'true');
		});

		it('saves an up vote on a passing check, and leaves its verdict alone', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = render({ results: [result('c1', 'success')] });

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('looks right'));

			expect(store.rateResult).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1', 'c1', {
				vote: 'up',
			});
			expect(store.acceptResult).not.toHaveBeenCalled();
		});

		// The judge never grades a case that errored, so the backend takes the user's
		// call as a completed pass and the row reads as passing from it alone.
		it('saves an up vote and marks a check that needs work as passing', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = render({ results: [result('c1', 'error')] });

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('looks right'));

			await vi.waitFor(() =>
				expect(store.acceptResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1'),
			);
			expect(store.rateResult).toHaveBeenCalled();
		});

		it('shows an errored case as passing once its accepted verdict is stored', () => {
			const accepted = {
				...result('c1', 'error'),
				verdict: { status: 'completed' as const, outcome: 'pass' as const, reasoning: null },
			};
			const { getByTestId } = render({ results: [accepted] });

			expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-status', 'pass');
		});

		it('toasts and hands nothing on when the vote cannot be saved', async () => {
			const user = userEvent.setup();
			const emit = vi.spyOn(agentsEventBus, 'emit');
			const { getByTestId, store } = render({ results: [failed] });
			vi.mocked(store.rateResult).mockRejectedValueOnce(new Error('forbidden'));

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('looks wrong'));

			await vi.waitFor(() => expect(showError).toHaveBeenCalled());
			expect(emit).not.toHaveBeenCalledWith('evalFixRequested', expect.anything());
			emit.mockRestore();
		});

		it('saves a down vote with the correction, then hands the check to the Assistant', async () => {
			const user = userEvent.setup();
			const emit = vi.spyOn(agentsEventBus, 'emit');
			const { getByTestId, store } = render({ results: [failed] });

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('looks wrong'));

			expect(store.rateResult).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1', 'c1', {
				vote: 'down',
				comment: 'It should decline.',
				correction: { finalText: 'It should decline.' },
			});
			await vi.waitFor(() =>
				expect(emit).toHaveBeenCalledWith(
					'evalFixRequested',
					expect.objectContaining({ projectId: 'project-1', agentId: 'agent-1', checkCount: 1 }),
				),
			);
			const request = emit.mock.calls.find(([event]) => event === 'evalFixRequested')?.[1];
			const prompt = (request as { prompt: string }).prompt;
			expect(prompt).toContain('It should decline.');
			expect(prompt).toContain('Declines off-topic requests');
			expect(prompt).toContain('What is the weather?');
			expect(prompt).toContain('answer c1');
			expect(prompt).toContain('It answered the weather question.');
			emit.mockRestore();
		});

		it('passes the saved vote to its row', () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.getReview).mockReturnValue({
				run: null,
				results: [result('c1', 'success')],
				resultsCount: 1,
				ratingsByResultId: {
					c1: {
						id: 'rating-1',
						resultId: 'c1',
						vote: 'up',
						comment: null,
						correction: null,
						ratedById: null,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
				},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});
			vi.mocked(store.isRunInFlight).mockReturnValue(false);
			vi.mocked(store.consumeFocusedEvalResult).mockReturnValue(null);

			const { getByTestId } = renderComponent({ pinia });

			expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-rating', 'up');
		});
	});

	// The checks view has no flow behind the row's Save check button, so the row
	// must not offer it.
	it('hides the correction note and Save check on every row', () => {
		const { getByTestId } = render({
			results: [result('c1', 'success'), result('c2', 'error')],
		});

		expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-hide-revise', 'true');
		expect(getByTestId('agent-eval-check-c2')).toHaveAttribute('data-hide-revise', 'true');
	});

	it('titles the view "Checks" and says what checks are for', () => {
		const { getByRole, getByText } = render({ results: [result('c1', 'success')] });

		expect(getByRole('heading', { name: 'Checks' })).toBeInTheDocument();
		expect(
			getByText(
				'See how your agent handles requests from different angles. Run them again after any change to check it still does.',
			),
		).toBeInTheDocument();
	});

	describe('adding a check', () => {
		const dataset = {
			id: 'ds-1',
			name: 'cases',
			description: null,
			agentId: 'agent-1',
			columnMapping: { input: 'input', criteria: 'criteria' },
			createdById: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			datasetSource: 'data_table' as const,
			datasetRef: { dataTableId: 'table-1' },
		};

		const renderWithDataset = (
			options: {
				columnMapping?: { input: string; criteria?: string };
				disabled?: boolean;
				rerunning?: boolean;
				inFlight?: boolean;
				sourceRowId?: string | null;
				/** The dataset's rows, read for the checks the run did not start with. */
				cases?: Array<{ rowId: number; input: string; whatToCheck: string }>;
			} = {},
		) => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.getReview).mockReturnValue({
				run: {
					id: 'run-1',
					datasetId: 'ds-1',
					agentVersionId: null,
					status: 'completed',
					runAt: '2026-01-01T00:00:00.000Z',
					completedAt: '2026-01-01T00:00:30.000Z',
					metrics: null,
					errorCode: null,
					errorDetails: null,
					createdById: null,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:30.000Z',
				},
				results: [
					{
						...result('c1', 'success'),
						sourceRowId: options.sourceRowId === undefined ? 'row-c1' : options.sourceRowId,
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
			vi.mocked(store.isRunInFlight).mockReturnValue(options.inFlight ?? false);
			vi.mocked(store.isStartingRun).mockReturnValue(false);
			vi.mocked(store.getDatasets).mockReturnValue([
				{ ...dataset, columnMapping: options.columnMapping ?? dataset.columnMapping },
			]);
			vi.mocked(store.fetchCases).mockResolvedValue(options.cases ?? []);
			return {
				...renderComponent({
					pinia,
					props: { disabled: options.disabled, rerunning: options.rerunning },
				}),
				store,
			};
		};

		it('offers no "Add a check" when the run has no dataset to write to', () => {
			const { queryByTestId } = render({ results: [result('c1', 'success')] });

			expect(queryByTestId('agent-eval-checks-add-check')).not.toBeInTheDocument();
		});

		it('offers no "Add a check" when the dataset has no column to store a rule in', () => {
			const { queryByTestId } = renderWithDataset({ columnMapping: { input: 'input' } });

			expect(queryByTestId('agent-eval-checks-add-check')).not.toBeInTheDocument();
		});

		it('keeps the panel unmounted until the button is first clicked', () => {
			const { getByTestId, queryByTestId } = renderWithDataset();

			expect(getByTestId('agent-eval-checks-add-check')).toHaveTextContent('Add a check');
			expect(queryByTestId('add-check-panel-stub')).not.toBeInTheDocument();
		});

		it('opens the panel with the dataset to write to, and the button gives way to it', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId } = renderWithDataset();

			await user.click(getByTestId('agent-eval-checks-add-check'));

			expect(getByTestId('add-check-panel-stub')).toBeVisible();
			expect(getByTestId('add-check-panel-stub')).toHaveAttribute('data-dataset', 'ds-1');
			expect(getByTestId('add-check-panel-stub')).toHaveAttribute('data-busy', 'false');
			expect(queryByTestId('agent-eval-checks-add-check')).not.toBeInTheDocument();
		});

		it('renders the panel below the checks, not above them', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithDataset();
			await user.click(getByTestId('agent-eval-checks-add-check'));

			const lastCheck = getByTestId('agent-eval-check-c1');
			const position = lastCheck.compareDocumentPosition(getByTestId('add-check-panel-stub'));

			expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		// "Added a check" starts a new run, whose review is empty until it loads. The
		// panel must stay mounted through that, or it drafts a fresh batch of prepared cases.
		it('keeps the same panel instance, and its dataset, while a new run loads', async () => {
			const user = userEvent.setup();
			const { getByTestId, rerender, store } = renderWithDataset();
			await user.click(getByTestId('agent-eval-checks-add-check'));
			expect(addCheckPanelMounts.count).toBe(1);
			const loaded = vi.mocked(store.getReview)('run-1');

			vi.mocked(store.getReview).mockImplementation((runId: string) =>
				runId === 'run-1' ? loaded : { ...loaded, run: null, results: [], resultsCount: 0 },
			);
			await rerender({ runId: 'run-2' });

			expect(addCheckPanelMounts.count).toBe(1);
			expect(getByTestId('add-check-panel-stub')).toHaveAttribute('data-dataset', 'ds-1');

			vi.mocked(store.getReview).mockReturnValue(loaded);
			await rerender({ runId: 'run-1' });

			expect(addCheckPanelMounts.count).toBe(1);
			expect(getByTestId('add-check-panel-stub')).toHaveAttribute('data-dataset', 'ds-1');
		});

		it('hides the panel when it asks to close, and brings the button back', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText } = renderWithDataset();
			await user.click(getByTestId('agent-eval-checks-add-check'));

			await user.click(getByText('close panel'));

			expect(getByTestId('add-check-panel-stub')).not.toBeVisible();
			expect(getByTestId('agent-eval-checks-add-check')).toBeInTheDocument();
		});

		// Hidden, not unmounted: reopening must not draft a new batch of prepared cases.
		it('reopens the same panel after it was closed, and the button gives way again', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText, queryByTestId } = renderWithDataset();
			await user.click(getByTestId('agent-eval-checks-add-check'));
			await user.click(getByText('close panel'));

			await user.click(getByTestId('agent-eval-checks-add-check'));

			expect(getByTestId('add-check-panel-stub')).toBeVisible();
			expect(queryByTestId('agent-eval-checks-add-check')).not.toBeInTheDocument();
			expect(addCheckPanelMounts.count).toBe(1);
		});

		it('reads the dataset again once a check was added, and does not run the checks', async () => {
			const user = userEvent.setup();
			const { getByTestId, getByText, emitted, store } = renderWithDataset({ sourceRowId: '7' });
			vi.mocked(store.fetchCases).mockResolvedValue([
				{ rowId: 7, input: 'request c1', whatToCheck: 'rule c1' },
			]);
			await user.click(getByTestId('agent-eval-checks-add-check'));
			await vi.waitFor(() => expect(store.fetchCases).toHaveBeenCalled());
			vi.mocked(store.fetchCases).mockClear();
			vi.mocked(store.fetchCases).mockResolvedValue([
				{ rowId: 7, input: 'request c1', whatToCheck: 'rule c1' },
				{ rowId: 8, input: 'request new', whatToCheck: 'rule new' },
			]);

			await user.click(getByText('added a check'));

			expect(store.fetchCases).toHaveBeenCalledWith(
				'project-1',
				expect.objectContaining({ datasetId: 'ds-1' }),
			);
			expect(await vi.waitFor(() => getByTestId('agent-eval-check-case-8'))).toHaveAttribute(
				'data-status',
				'idle',
			);
			expect(emitted('rerun')).toBeUndefined();
		});

		it('shows the dataset’s cases that the run did not start with as not run, after the run’s own', async () => {
			const { getAllByTestId, getByTestId } = renderWithDataset({
				sourceRowId: '7',
				cases: [
					{ rowId: 7, input: 'request c1', whatToCheck: 'rule c1' },
					{ rowId: 8, input: 'request new', whatToCheck: 'rule new' },
				],
			});

			await vi.waitFor(() => expect(getAllByTestId(/^agent-eval-check-/)).toHaveLength(2));
			const [ran, notRun] = getAllByTestId(/^agent-eval-check-/);
			expect(ran).toHaveAttribute('data-testid', 'agent-eval-check-c1');
			expect(notRun).toHaveAttribute('data-testid', 'agent-eval-check-case-8');
			expect(notRun).toHaveAttribute('data-status', 'idle');
			expect(notRun).toHaveTextContent('request new');
			// "All" counts every check, run or not, so the summary option gives way.
			expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('All 2');
			expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('1 passed');
		});

		it('removes a not-run check from the dataset only, since it has no result', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = renderWithDataset({ sourceRowId: '7' });
			vi.mocked(store.fetchCases).mockResolvedValue([
				{ rowId: 7, input: 'request c1', whatToCheck: 'rule c1' },
				{ rowId: 8, input: 'request new', whatToCheck: 'rule new' },
			]);
			vi.mocked(store.deleteCase).mockResolvedValue(true);
			await user.click(getByTestId('agent-eval-checks-add-check'));
			await user.click(getByTestId('add-check-panel-stub').querySelectorAll('button')[1]);
			const notRun = await vi.waitFor(() => getByTestId('agent-eval-check-case-8'));

			await user.click(within(notRun).getByText('delete check'));

			expect(store.deleteCase).toHaveBeenCalledWith(
				'project-1',
				expect.objectContaining({ datasetId: 'ds-1' }),
				8,
			);
			expect(store.deleteResult).not.toHaveBeenCalled();
		});

		it('opens Add a check on arrival when the Assistant asked for it', () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.consumeAddCheckOpen).mockImplementation((agentId) => agentId === 'agent-1');
			vi.mocked(store.getReview).mockReturnValue({
				run: null,
				results: [result('c1', 'success')],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});
			vi.mocked(store.isRunInFlight).mockReturnValue(false);
			vi.mocked(store.isStartingRun).mockReturnValue(false);

			const { getByTestId } = renderComponent({ pinia });

			expect(store.consumeAddCheckOpen).toHaveBeenCalledWith('agent-1');
			expect(getByTestId('add-check-panel-stub')).toBeVisible();
		});

		it('keeps Add a check closed on arrival when nothing asked for it', () => {
			const { queryByTestId, store } = renderWithDataset();

			expect(store.consumeAddCheckOpen).toHaveBeenCalledWith('agent-1');
			expect(queryByTestId('add-check-panel-stub')).not.toBeInTheDocument();
		});

		// "Run all checks" reads the dataset rows, not the results' snapshots, so an
		// edited rule that only reached the snapshot would be lost on the next full run.
		describe('saving an edited rule', () => {
			it('writes the rule to the check’s own row first, then reruns it', async () => {
				const user = userEvent.setup();
				const { getByTestId, store } = renderWithDataset({ sourceRowId: '7' });
				vi.mocked(store.updateCaseRule).mockResolvedValue(true);

				await user.click(within(getByTestId('agent-eval-check-c1')).getByText('save rule'));

				expect(store.updateCaseRule).toHaveBeenCalledWith(
					'project-1',
					expect.objectContaining({ datasetId: 'ds-1' }),
					7,
					'Mentions the refund window.',
				);
				expect(store.rerunResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1', {
					whatToCheck: 'Mentions the refund window.',
				});
				expect(vi.mocked(store.updateCaseRule).mock.invocationCallOrder[0]).toBeLessThan(
					vi.mocked(store.rerunResult).mock.invocationCallOrder[0],
				);
			});

			it('does not rerun with a rule it could not save, so the next full run cannot undo it', async () => {
				const user = userEvent.setup();
				const { getByTestId, store } = renderWithDataset({ sourceRowId: '7' });
				vi.mocked(store.updateCaseRule).mockResolvedValue(false);

				await user.click(within(getByTestId('agent-eval-check-c1')).getByText('save rule'));

				await vi.waitFor(() => expect(showError).toHaveBeenCalled());
				expect(store.rerunResult).not.toHaveBeenCalled();
			});

			it('keeps the snapshot-only edit for a result with no row to write to', async () => {
				const user = userEvent.setup();
				const { getByTestId, store } = renderWithDataset({ sourceRowId: null });

				await user.click(within(getByTestId('agent-eval-check-c1')).getByText('save rule'));

				expect(store.updateCaseRule).not.toHaveBeenCalled();
				expect(store.rerunResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1', {
					whatToCheck: 'Mentions the refund window.',
				});
			});

			it('keeps the snapshot-only edit when the dataset has no column to store a rule in', async () => {
				const user = userEvent.setup();
				const { getByTestId, store } = renderWithDataset({
					sourceRowId: '7',
					columnMapping: { input: 'input' },
				});

				await user.click(within(getByTestId('agent-eval-check-c1')).getByText('save rule'));

				expect(store.updateCaseRule).not.toHaveBeenCalled();
				expect(store.rerunResult).toHaveBeenCalled();
			});
		});

		it.each([
			['a rerun is starting', { rerunning: true }],
			['a run is in flight', { inFlight: true }],
		])('tells the panel it is busy while %s', async (_label, options) => {
			const user = userEvent.setup();
			const { getByTestId } = renderWithDataset(options);

			await user.click(getByTestId('agent-eval-checks-add-check'));

			expect(getByTestId('add-check-panel-stub')).toHaveAttribute('data-busy', 'true');
		});

		it('disables the button and the panel for a read-only viewer', async () => {
			const { getByTestId } = renderWithDataset({ disabled: true });

			expect(getByTestId('agent-eval-checks-add-check')).toBeDisabled();
		});
	});

	describe('deleting a check', () => {
		const dataset = {
			id: 'ds-1',
			name: 'cases',
			description: null,
			agentId: 'agent-1',
			columnMapping: { input: 'input', criteria: 'criteria' },
			createdById: null,
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			datasetSource: 'data_table' as const,
			datasetRef: { dataTableId: 'table-1' },
		};

		const renderWithRun = (resultOverrides: Partial<AgentEvalResultRecord> = {}) => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.getReview).mockReturnValue({
				run: {
					id: 'run-1',
					datasetId: 'ds-1',
					agentVersionId: null,
					status: 'completed',
					runAt: '2026-01-01T00:00:00.000Z',
					completedAt: '2026-01-01T00:00:30.000Z',
					metrics: null,
					errorCode: null,
					errorDetails: null,
					createdById: null,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:30.000Z',
				},
				results: [{ ...result('c1', 'success'), sourceRowId: '1', ...resultOverrides }],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			});
			vi.mocked(store.isRunInFlight).mockReturnValue(false);
			vi.mocked(store.isStartingRun).mockReturnValue(false);
			vi.mocked(store.getDatasets).mockReturnValue([dataset]);
			vi.mocked(store.fetchCases).mockResolvedValue([]);
			return { ...renderComponent({ pinia }), store };
		};

		it('deletes the underlying case and drops the row once confirmed', async () => {
			const user = userEvent.setup();
			const { getByTestId, queryByTestId, store } = renderWithRun();
			vi.mocked(store.deleteCase).mockResolvedValue(true);

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('delete check'));

			expect(store.deleteCase).toHaveBeenCalledWith(
				'project-1',
				{
					datasetId: 'ds-1',
					dataTableId: 'table-1',
					columns: { input: 'input', whatToCheck: 'criteria' },
				},
				1,
			);
			await vi.waitFor(() =>
				expect(store.deleteResult).toHaveBeenCalledWith('project-1', 'agent-1', 'c1'),
			);
			// The mocked row component never actually re-renders itself out of the
			// tree — this only proves the delete request and cache cleanup ran.
			expect(queryByTestId('agent-eval-check-c1')).toBeInTheDocument();
		});

		it('toasts an error and does not touch the cache when the delete fails', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = renderWithRun();
			vi.mocked(store.deleteCase).mockResolvedValue(false);

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('delete check'));

			await vi.waitFor(() => expect(store.deleteCase).toHaveBeenCalled());
			expect(store.deleteResult).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalledTimes(1);
			expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't remove the test case");
		});

		it('toasts an error without calling deleteCase when the dataset cannot be resolved', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = renderWithRun();
			vi.mocked(store.getDatasets).mockReturnValue([]);

			await user.click(within(getByTestId('agent-eval-check-c1')).getByText('delete check'));

			expect(store.deleteCase).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalledTimes(1);
			expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't remove the test case");
		});
	});

	it('disables "Run all checks" while a run is already in flight', () => {
		const { getByTestId } = render({ results: [result('c1', 'running')] }, true);

		expect(getByTestId('agent-eval-checks-run-all')).toHaveAttribute('disabled');
	});

	it('forwards disabled to every row', () => {
		const { getByTestId } = render({
			results: [result('c1', 'success')],
			disabled: true,
		});

		expect(getByTestId('agent-eval-check-c1')).toHaveAttribute('data-disabled', 'true');
	});

	// Filtering by status needs the whole run, not just the first loaded page —
	// left to a manual "Show more cases" click, a run bigger than one page would
	// under-count every pill and hide matching rows from the filter.
	it('eagerly loads every remaining page so counts and filtering cover the whole run', async () => {
		const allResults = [
			result('pass-1', 'success'),
			result('pass-2', 'success'),
			result('fail-1', 'error'),
		];
		const { getByTestId, store } = renderWithGrowablePage(allResults, 1);

		await vi.waitFor(() => {
			expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('3');
		});
		expect(store.loadMoreResults).toHaveBeenCalledTimes(2);
		expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent('1');
	});

	it('stops loading more once a call makes no progress, instead of looping forever', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();
		// Always reports one more case than it ever actually returns.
		vi.mocked(store.getReview).mockReturnValue({
			run: null,
			results: [result('c1', 'success')],
			resultsCount: 5,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});
		vi.mocked(store.isRunInFlight).mockReturnValue(false);
		vi.mocked(store.isStartingRun).mockReturnValue(false);
		vi.mocked(store.loadMoreResults).mockResolvedValue(undefined);

		renderComponent({ pinia });

		await vi.waitFor(() => expect(store.loadMoreResults).toHaveBeenCalled());
		// A second tick would mean it's still spinning rather than having given up.
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(store.loadMoreResults).toHaveBeenCalledTimes(1);
	});

	// `openRun` replaces `results`/`run` wholesale once it resolves — pagination
	// starting before that lands (or continuing for a run the view has since
	// moved off of) would race that replace and corrupt the page.
	it('does not start pagination before openRun resolves', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();
		vi.mocked(store.getReview).mockReturnValue({
			run: null,
			results: [result('c1', 'success')],
			resultsCount: 3,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});
		vi.mocked(store.isRunInFlight).mockReturnValue(false);
		vi.mocked(store.isStartingRun).mockReturnValue(false);
		let resolveOpenRun!: () => void;
		vi.mocked(store.openRun).mockImplementation(
			async () =>
				await new Promise<void>((resolve) => {
					resolveOpenRun = resolve;
				}),
		);
		vi.mocked(store.loadMoreResults).mockResolvedValue(undefined);

		renderComponent({ pinia });
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(store.loadMoreResults).not.toHaveBeenCalled();

		resolveOpenRun();
		await vi.waitFor(() => expect(store.loadMoreResults).toHaveBeenCalled());
	});

	it('stops paginating the old run once the run switches, instead of racing the new run', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();

		const run1All = [result('a1', 'success'), result('a2', 'success'), result('a3', 'success')];
		// Also has an unloaded page, so a generation-unaware stale loop has
		// somewhere to (wrongly) go once `props.runId` flips underneath it.
		const run2All = [result('b1', 'success'), result('b2', 'success')];
		const run1Loaded = ref(1);
		const run2Loaded = ref(1);
		const baseReview = {
			run: null,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		};
		vi.mocked(store.getReview).mockImplementation((runId: string) =>
			runId === 'run-1'
				? {
						...baseReview,
						results: run1All.slice(0, run1Loaded.value),
						resultsCount: run1All.length,
					}
				: {
						...baseReview,
						results: run2All.slice(0, run2Loaded.value),
						resultsCount: run2All.length,
					},
		);
		vi.mocked(store.isRunInFlight).mockReturnValue(false);
		vi.mocked(store.isStartingRun).mockReturnValue(false);

		// run-2's openRun is held pending, so pagination racing ahead of it is
		// directly observable: anything touching run-2 before this resolves is
		// the bug cubic flagged.
		let resolveRun2Open!: () => void;
		vi.mocked(store.openRun).mockImplementation(async (_projectId, _agentId, runId) => {
			if (runId === 'run-1') return;
			await new Promise<void>((resolve) => {
				resolveRun2Open = resolve;
			});
		});

		let releaseSecondCall!: () => void;
		const secondCallGate = new Promise<void>((resolve) => {
			releaseSecondCall = resolve;
		});
		let run1Calls = 0;
		const run2CallsBeforeOpen: number[] = [];
		let run2Open = false;
		vi.mocked(store.loadMoreResults).mockImplementation(async (_projectId, _agentId, runId) => {
			if (runId === 'run-2') {
				if (!run2Open) run2CallsBeforeOpen.push(run2Loaded.value);
				run2Loaded.value = Math.min(run2Loaded.value + 1, run2All.length);
				return;
			}
			run1Calls++;
			if (run1Calls === 1) {
				run1Loaded.value = 2; // Makes progress, so the loop wants a 2nd page.
				return;
			}
			// The 2nd call for run-1 is held pending — the run switch below happens
			// while it's still in flight.
			await secondCallGate;
			run1Loaded.value = 3;
		});

		const { rerender } = renderComponent({ pinia });
		await vi.waitFor(() => expect(run1Calls).toBe(2));

		await rerender({ runId: 'run-2' });
		await vi.waitFor(() =>
			expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-2'),
		);

		// Let the stale run-1 call resolve while run-2's openRun is still pending.
		releaseSecondCall();
		await new Promise((resolve) => setTimeout(resolve, 10));

		// The stale run-1 loop neither asked run-1 for a 3rd page nor jumped to
		// paginating run-2 ahead of its openRun.
		expect(run1Calls).toBe(2);
		expect(run2CallsBeforeOpen).toEqual([]);

		run2Open = true;
		resolveRun2Open();
		await vi.waitFor(() => expect(run2Loaded.value).toBe(run2All.length));
	});

	// cubic flagged: a newer run's pagination call can arrive while the old
	// run's loop still holds the lock, see nothing to join, and return — with
	// nothing left to retry it, that run's extra pages never load at all.
	it('retries pagination for the new run once the old run releases the lock, instead of skipping it forever', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();

		const run1All = [result('a1', 'success'), result('a2', 'success')];
		const run2All = [result('b1', 'success'), result('b2', 'success')];
		const run1Loaded = ref(1);
		const run2Loaded = ref(1);
		const baseReview = {
			run: null,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		};
		vi.mocked(store.getReview).mockImplementation((runId: string) =>
			runId === 'run-1'
				? {
						...baseReview,
						results: run1All.slice(0, run1Loaded.value),
						resultsCount: run1All.length,
					}
				: {
						...baseReview,
						results: run2All.slice(0, run2Loaded.value),
						resultsCount: run2All.length,
					},
		);
		vi.mocked(store.isRunInFlight).mockReturnValue(false);
		vi.mocked(store.isStartingRun).mockReturnValue(false);
		// run-2's openRun resolves right away — unlike the other race test, it's
		// the lock release (not openRun) that's slow to arrive here.
		vi.mocked(store.openRun).mockResolvedValue(undefined);

		let releaseRun1!: () => void;
		const run1Gate = new Promise<void>((resolve) => {
			releaseRun1 = resolve;
		});
		vi.mocked(store.loadMoreResults).mockImplementation(async (_projectId, _agentId, runId) => {
			if (runId === 'run-1') {
				await run1Gate;
				run1Loaded.value = 2;
				return;
			}
			run2Loaded.value = Math.min(run2Loaded.value + 1, run2All.length);
		});

		const { rerender } = renderComponent({ pinia });
		await vi.waitFor(() =>
			expect(store.loadMoreResults).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1'),
		);

		// Switch runs while run-1's loop is still stuck awaiting its pending call.
		await rerender({ runId: 'run-2' });
		await vi.waitFor(() =>
			expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-2'),
		);
		// run-2's own attempt finds the lock held and must bail out rather than
		// join in — give it a tick to (wrongly, pre-fix) call in anyway.
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(store.loadMoreResults).not.toHaveBeenCalledWith('project-1', 'agent-1', 'run-2');

		// Releasing the old run's lock is the only thing left that can still
		// pick run-2 back up.
		releaseRun1();

		await vi.waitFor(() => expect(run2Loaded.value).toBe(run2All.length));
	});

	// Marking the last needs-work row "looks right" makes `filteredRows` fall
	// back to unfiltered already (guarded by the live count), but without also
	// resetting `statusFilter` itself, no pill would read as selected even
	// though every row is now showing.
	it('resets the filter to "all" once marking the last needs-work row "looks right" empties it', async () => {
		const pinia = createTestingPinia({ stubActions: true });
		const store = useAgentEvalsStore();
		const results = ref([result('pass-1', 'success'), result('fail-1', 'error')]);
		vi.mocked(store.getReview).mockImplementation(() => ({
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
		vi.mocked(store.isRunInFlight).mockReturnValue(false);
		vi.mocked(store.isStartingRun).mockReturnValue(false);
		// What the real action does: the accepted verdict lands on the cached row.
		vi.mocked(store.acceptResult).mockImplementation(async (_project, _agent, id) => {
			results.value = results.value.map((r) =>
				r.id === id
					? { ...r, verdict: { status: 'completed', outcome: 'pass', reasoning: null } }
					: r,
			);
			return results.value.find((r) => r.id === id) as AgentEvalResultRecord;
		});
		const user = userEvent.setup();
		const { getByTestId, getAllByTestId, queryByTestId } = renderComponent({ pinia });

		await user.click(getByTestId('agent-eval-checks-filter-needs-work'));
		expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(1);

		const row = getByTestId('agent-eval-check-fail-1');
		await user.click(within(row).getByText('looks right'));

		// The needs-work pill is gone (nothing needs work anymore) and every row
		// shows again. All checks pass, so the control shows its one summary option.
		await vi.waitFor(() =>
			expect(queryByTestId('agent-eval-checks-filter-needs-work')).not.toBeInTheDocument(),
		);
		expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('All 2 passed');
		expect(getByTestId('agent-eval-checks-filter-pass').closest('[role="radio"]')).toHaveAttribute(
			'aria-checked',
			'true',
		);
		expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);
	});
});
