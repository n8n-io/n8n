import { describe, it, expect, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseRunResult from './TestCaseRunResult.vue';
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

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution: vi.fn().mockResolvedValue(null) }),
}));

const renderComponent = createComponentRenderer(TestCaseRunResult);

// Two terminal runs for the same workflow; the older passed this row, the newer
// failed it — so which run is rendered is unambiguous from the badge score.
function seedTwoRuns() {
	createTestingPinia({ stubActions: false });
	const evaluationStore = useEvaluationStore();
	evaluationStore.testRunsById = {
		'run-old': {
			id: 'run-old',
			workflowId: 'wf-1',
			status: 'success',
			createdAt: '2026-06-19T20:00:00.000Z',
			runAt: '2026-06-19T20:00:00.000Z',
		},
		'run-new': {
			id: 'run-new',
			workflowId: 'wf-1',
			status: 'success',
			createdAt: '2026-06-19T21:00:00.000Z',
			runAt: '2026-06-19T21:00:00.000Z',
		},
	} as never;
	evaluationStore.testCaseExecutionsById = {
		eo: {
			id: 'eo',
			testRunId: 'run-old',
			runIndex: 0,
			status: 'success',
			metrics: { stringSimilarity: 1 },
		},
		en: {
			id: 'en',
			testRunId: 'run-new',
			runIndex: 0,
			status: 'success',
			metrics: { stringSimilarity: 0 },
		},
	} as never;
	return evaluationStore;
}

describe('TestCaseRunResult', () => {
	it('renders the pinned run when a runId is given, not the newest run', () => {
		seedTwoRuns();
		const { getByTestId } = renderComponent({ props: { index: 0, runId: 'run-old' } });
		// run-old scored this row 100% — proves it pinned the older run, not run-new.
		expect(getByTestId('tests-result-badge-0-stringSimilarity').textContent).toContain('100%');
	});

	it('falls back to the newest run when no runId is given (overview cards)', () => {
		seedTwoRuns();
		const { getByTestId } = renderComponent({ props: { index: 0 } });
		// run-new is chronologically newest and scored this row 0%.
		expect(getByTestId('tests-result-badge-0-stringSimilarity').textContent).toContain('0%');
	});

	it('renders nothing when the target run has no execution for this row', () => {
		seedTwoRuns();
		// run-old is terminal and never ran row 1 → no running state, no result.
		const { queryByTestId } = renderComponent({ props: { index: 1, runId: 'run-old' } });
		expect(queryByTestId('tests-result-running-1')).toBeNull();
		expect(queryByTestId('tests-result-result-1')).toBeNull();
	});
});
