import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseResultCard from './TestCaseResultCard.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(str, [k, v]) => str.replace(`{${k}}`, v),
					key,
				);
			}
			return key;
		},
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ref({ workflowId: 'wf-1' }),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

const mockFetchExecution = vi.fn().mockResolvedValue(null);
vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution: mockFetchExecution }),
}));

const renderComponent = createComponentRenderer(TestCaseResultCard);

function setup() {
	createTestingPinia({ stubActions: false });
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const evaluationStore = useEvaluationStore();
	wizardStore.datasetInputsByRow = [{ chatMessage: 'hello there' }];
	wizardStore.aiNodeName = 'Darwin';
	evaluationStore.testRunsById = {
		run1: {
			id: 'run1',
			workflowId: 'wf-1',
			status: 'success',
			metrics: { correctness: 0 },
			createdAt: '2026-06-19T20:52:00.000Z',
			runAt: '2026-06-19T20:52:00.000Z',
		},
	} as never;
	evaluationStore.testCaseExecutionsById = {
		c1: {
			id: 'c1',
			testRunId: 'run1',
			status: 'error',
			runIndex: 0,
			createdAt: '2026-06-19T20:52:00.000Z',
			runAt: '2026-06-19T20:52:00.000Z',
			metrics: { correctness: 0 },
			outputs: { response: "I don't know anything about your users." },
		},
	} as never;
	return wizardStore;
}

describe('TestCaseResultCard', () => {
	beforeEach(() => {
		mockFetchExecution.mockReset().mockResolvedValue(null);
	});

	it('renders the case title and run summary', () => {
		setup();
		const { getByTestId, getByText } = renderComponent({ props: { index: 0 } });
		expect(getByTestId('tests-result-card-0')).toBeInTheDocument();
		// i18n is mocked to return the key, so assert the run-label key is rendered.
		expect(getByText('evaluations.tests.results.runLabel')).toBeInTheDocument();
	});

	it('renders a metric badge from the case metrics', () => {
		setup();
		const { getByTestId } = renderComponent({ props: { index: 0 } });
		expect(getByTestId('tests-result-badge-0-correctness')).toBeInTheDocument();
	});

	it('fails a deterministic metric below a perfect score (matches shared casePassed)', () => {
		setup();
		const evaluationStore = useEvaluationStore();
		evaluationStore.testCaseExecutionsById = {
			c1: {
				id: 'c1',
				testRunId: 'run1',
				status: 'success',
				runIndex: 0,
				metrics: { stringSimilarity: 0.7 },
				outputs: {},
			},
		} as never;

		const { getByTestId } = renderComponent({ props: { index: 0 } });
		const badge = getByTestId('tests-result-badge-0-stringSimilarity');
		// 0.7 isn't perfect → fail, the same rule the run detail / wizard apply, so
		// a case can't read pass here and fail there.
		expect(badge.className).toContain('badgeFail');
		expect(badge.textContent).toContain('70%');
	});

	it('expands to show the input definition and output', async () => {
		setup();
		const { getByTestId, queryByText, findByText } = renderComponent({ props: { index: 0 } });
		expect(queryByText('chatMessage')).toBeNull();

		await userEvent.click(getByTestId('tests-result-toggle-0'));

		expect(await findByText('chatMessage')).toBeInTheDocument();
		// No executionId on the case → falls back to the persisted `outputs`.
		expect(await findByText("I don't know anything about your users.")).toBeInTheDocument();
	});

	it('shows the node-under-test output from the run, not the empty `outputs`', async () => {
		setup();
		const evaluationStore = useEvaluationStore();
		evaluationStore.testCaseExecutionsById = {
			c1: {
				id: 'c1',
				testRunId: 'run1',
				status: 'success',
				runIndex: 0,
				executionId: 'exec-1',
				metrics: { correctness: 5 },
				outputs: {},
			},
		} as never;
		mockFetchExecution.mockResolvedValue({
			id: 'exec-1',
			data: {
				resultData: {
					runData: { Darwin: [{ data: { main: [[{ json: { output: 'the real answer' } }]] } }] },
				},
			},
		});

		const { getByTestId, findByText } = renderComponent({ props: { index: 0 } });
		await userEvent.click(getByTestId('tests-result-toggle-0'));

		expect(mockFetchExecution).toHaveBeenCalledWith('exec-1');
		expect(await findByText('the real answer')).toBeInTheDocument();
	});

	it('shows a running state while the run is in progress', () => {
		setup();
		const evaluationStore = useEvaluationStore();
		evaluationStore.testRunsById = {
			run1: {
				id: 'run1',
				workflowId: 'wf-1',
				status: 'running',
				createdAt: '2026-06-19T20:52:00.000Z',
				runAt: '2026-06-19T20:52:00.000Z',
			},
		} as never;
		evaluationStore.testCaseExecutionsById = {
			c1: { id: 'c1', testRunId: 'run1', status: 'running', runIndex: 0 },
		} as never;

		const { getByTestId, queryByTestId } = renderComponent({ props: { index: 0 } });
		expect(getByTestId('tests-result-running-0')).toBeInTheDocument();
		expect(queryByTestId('tests-result-result-0')).toBeNull();
	});

	it('shows operational metrics as gray text (no %) only when expanded', async () => {
		setup();
		const evaluationStore = useEvaluationStore();
		evaluationStore.testCaseExecutionsById = {
			c1: {
				id: 'c1',
				testRunId: 'run1',
				status: 'success',
				runIndex: 0,
				metrics: { correctness: 5, totalTokens: 1234, executionTime: 2500 },
				outputs: { response: 'ok' },
			},
		} as never;

		const { getByTestId, queryByTestId, findByText } = renderComponent({ props: { index: 0 } });
		// Hidden until expanded.
		expect(queryByTestId('tests-result-operational-0')).toBeNull();
		// Token metric is NOT rendered as a check badge.
		expect(queryByTestId('tests-result-badge-0-totalTokens')).toBeNull();

		await userEvent.click(getByTestId('tests-result-toggle-0'));
		expect(getByTestId('tests-result-operational-0')).toBeInTheDocument();
		// Time formatted without a percentage.
		expect(await findByText(/2\.5s/)).toBeInTheDocument();
	});

	it('opens the detail to edit when the title is clicked', async () => {
		const store = setup();
		const { getByTestId } = renderComponent({ props: { index: 0 } });
		await userEvent.click(getByTestId('tests-result-edit-0'));
		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBe(0);
	});
});
