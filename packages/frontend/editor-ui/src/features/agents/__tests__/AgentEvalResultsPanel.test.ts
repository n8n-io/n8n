import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultRecord } from '../agentEvals.types';
import AgentEvalResultsPanel from '../components/AgentEvalResultsPanel.vue';

configure({ testIdAttribute: 'data-testid' });

// The rows have their own suite; this one is about the card around them.
vi.mock('../components/AgentEvalResultRow.vue', () => ({
	default: { name: 'AgentEvalResultRow', template: '<div data-testid="agent-eval-result-row" />' },
}));

const result = (id: string): AgentEvalResultRecord => ({
	id,
	runId: 'run-1',
	sourceRowId: `row-${id}`,
	runIndex: 0,
	status: 'success',
	input: { input: `request ${id}` },
	output: { finalText: `answer ${id}` },
	toolCalls: null,
	metrics: null,
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:00:30.000Z',
	errorCode: null,
	errorDetails: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:30.000Z',
});

const renderComponent = createComponentRenderer(AgentEvalResultsPanel, {
	props: { projectId: 'project-1', agentId: 'agent-1', runId: 'run-1' },
});

/** Renders with the store's review state stubbed to the given page + counts. */
const render = (
	review: {
		results?: AgentEvalResultRecord[];
		resultsCount?: number;
		loadingMore?: boolean;
	} = {},
	reviewedCount = 0,
	inFlight = false,
) => {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();

	vi.mocked(store.getReview).mockReturnValue({
		run: null,
		results: review.results ?? [],
		resultsCount: review.resultsCount ?? 0,
		ratingsByResultId: {},
		pendingByResultId: {},
		draftsByResultId: {},
		loading: false,
		loadingMore: review.loadingMore ?? false,
	});
	vi.mocked(store.reviewedCount).mockReturnValue(reviewedCount);
	// No row is mid-edit in these cases; the row suite covers that.
	vi.mocked(store.getDraft).mockReturnValue(undefined);
	vi.mocked(store.isStartingRun).mockReturnValue(false);
	vi.mocked(store.isRunInFlight).mockReturnValue(inFlight);

	return { ...renderComponent({ pinia }), store };
};

describe('AgentEvalResultsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('opens the run on mount', () => {
		const { store } = render();

		expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
	});

	describe('header counts', () => {
		// The total is the run's size, not how much of it happens to be loaded.
		it('reports the run total rather than the loaded page length', () => {
			const { getByTestId } = render({ results: [result('c1')], resultsCount: 7 });

			expect(getByTestId('agent-eval-cases-run-chip')).toHaveTextContent('7 cases run');
		});

		it('reports reviewed against the run total', () => {
			const { getByTestId } = render({ results: [result('c1')], resultsCount: 5 }, 4);

			expect(getByTestId('agent-eval-reviewed-chip')).toHaveTextContent('4 of 5 reviewed');
		});

		it('uses the singular form for a one-case run', () => {
			const { getByTestId } = render({ results: [result('c1')], resultsCount: 1 });

			expect(getByTestId('agent-eval-cases-run-chip')).toHaveTextContent('1 case run');
		});
	});

	describe('pagination', () => {
		it('offers more cases while the page is short of the total', async () => {
			const { getByTestId, store } = render({ results: [result('c1')], resultsCount: 3 });

			await userEvent.click(getByTestId('agent-eval-load-more'));

			expect(store.loadMoreResults).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
		});

		it('hides the action once every case is loaded', () => {
			const { queryByTestId } = render({ results: [result('c1')], resultsCount: 1 });

			expect(queryByTestId('agent-eval-load-more')).not.toBeInTheDocument();
		});
	});

	describe('footer progress', () => {
		it('uses the singular sentence with one case left', () => {
			const { getByText } = render({ results: [result('c1')], resultsCount: 5 }, 4);

			expect(
				getByText('1 case still to review — send now, or finish it first.'),
			).toBeInTheDocument();
		});

		it('uses the plural sentence with several left', () => {
			const { getByText } = render({ results: [result('c1')], resultsCount: 5 }, 3);

			expect(
				getByText('2 cases still to review — send now, or finish them first.'),
			).toBeInTheDocument();
		});

		it('says so when nothing is left to review', () => {
			const { getByText } = render({ results: [result('c1')], resultsCount: 2 }, 2);

			expect(getByText('Every case reviewed.')).toBeInTheDocument();
		});
	});

	// Nothing reads a run's ratings back yet, so the handoff cannot work.
	it('renders the assistant handoff disabled', () => {
		const { getByTestId } = render({ results: [result('c1')], resultsCount: 1 });

		expect(getByTestId('agent-eval-send-feedback')).toBeDisabled();
	});

	it('asks the surface above to re-run rather than switching runs itself', async () => {
		const { getByTestId, emitted } = render({ results: [result('c1')], resultsCount: 1 });

		await userEvent.click(getByTestId('agent-eval-rerun-button'));

		expect(emitted().rerun).toHaveLength(1);
	});

	describe('an in-flight run', () => {
		it('is watched until it settles', async () => {
			const { store } = render({}, 0, true);
			await flushPromises();

			expect(store.startPollingRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
		});

		it('is not watched once it has settled', async () => {
			const { store } = render({}, 0, false);
			await flushPromises();

			expect(store.startPollingRun).not.toHaveBeenCalled();
		});

		// Leaving the surface must not leave a timer polling a run nobody is reading.
		it('stops being watched when the card goes away', async () => {
			const { store, unmount } = render({}, 0, true);
			await flushPromises();

			unmount();

			expect(store.stopPollingRun).toHaveBeenCalled();
		});
	});

	it('renders a row per loaded case', () => {
		const { getAllByTestId } = render({
			results: [result('c1'), result('c2')],
			resultsCount: 2,
		});

		expect(getAllByTestId('agent-eval-result-row')).toHaveLength(2);
	});

	// No pass/fail vocabulary may appear anywhere on this surface.
	it('never renders a verdict', () => {
		const { queryByText } = render({ results: [result('c1')], resultsCount: 1 });

		expect(queryByText(/passed/i)).not.toBeInTheDocument();
		expect(queryByText(/failed/i)).not.toBeInTheDocument();
		expect(queryByText(/need a look/i)).not.toBeInTheDocument();
	});
});
