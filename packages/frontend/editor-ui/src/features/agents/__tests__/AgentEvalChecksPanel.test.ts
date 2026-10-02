import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultRecord, AgentEvalResultStatus } from '../agentEvals.types';
import AgentEvalChecksPanel from '../components/AgentEvalChecksPanel.vue';

configure({ testIdAttribute: 'data-testid' });

// The rows have their own suite; this one is about the panel around them.
vi.mock('../components/AgentEvalTryRow.vue', () => ({
	default: {
		name: 'AgentEvalTryRow',
		props: ['status', 'input', 'output', 'label', 'testId'],
		emits: ['save-check', 'actually-fine'],
		template: `<div :data-testid="testId" :data-status="status">{{ input }}</div>`,
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
	review: { results?: AgentEvalResultRecord[]; resultsCount?: number; loadingMore?: boolean } = {},
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

	return { ...renderComponent({ pinia }), store };
};

describe('AgentEvalChecksPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('opens the run on mount', () => {
		const { store } = render();

		expect(store.openRun).toHaveBeenCalledWith('project-1', 'agent-1', 'run-1');
	});

	it('renders one row per result', () => {
		const { getAllByTestId } = render({
			results: [result('c1', 'success'), result('c2', 'error')],
		});

		expect(getAllByTestId(/agent-eval-check-/)).toHaveLength(2);
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

	describe('pill visibility', () => {
		// Each pill is dynamic on its own count — a run that's all passing still
		// shows "Pass" and "All", it just has nothing to show under "Needs work".
		it('hides the needs-work pill but shows pass and all when everything passes', () => {
			const { queryByTestId, getByTestId } = render({
				results: [result('pass-1', 'success'), result('pass-2', 'success')],
			});

			expect(queryByTestId('agent-eval-checks-filter-needs-work')).not.toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-pass')).toHaveTextContent('2');
			expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('2');
		});

		it('hides the pass pill but shows needs-work and all when everything needs work', () => {
			const { queryByTestId, getByTestId } = render({
				results: [result('fail-1', 'error'), result('fail-2', 'error')],
			});

			expect(queryByTestId('agent-eval-checks-filter-pass')).not.toBeInTheDocument();
			expect(getByTestId('agent-eval-checks-filter-needs-work')).toHaveTextContent('2');
			expect(getByTestId('agent-eval-checks-filter-all')).toHaveTextContent('2');
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
	});

	it('emits rerun when "Run all checks" is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = render({ results: [result('c1', 'success')] });

		await user.click(getByTestId('agent-eval-checks-run-all'));

		expect(emitted('rerun')).toBeTruthy();
	});

	it('disables "Run all checks" while a run is already in flight', () => {
		const { getByTestId } = render({ results: [result('c1', 'running')] }, true);

		expect(getByTestId('agent-eval-checks-run-all')).toHaveAttribute('disabled');
	});
});
