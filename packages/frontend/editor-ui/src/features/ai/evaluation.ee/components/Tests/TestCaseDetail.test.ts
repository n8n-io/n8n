import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TestCaseDetail from './TestCaseDetail.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';

// ─── Module-level mocks ───────────────────────────────────────────────────────

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
			return `mocked-${key}`;
		},
	}),
}));

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

const mockSliceInputs = ref({
	fieldNames: ['query'] as string[],
	values: { query: 'test input' } as Record<string, string>,
	hasExecution: true,
});

vi.mock('../../composables/useSliceInputs', () => ({
	useSliceInputs: () => mockSliceInputs,
}));

vi.mock('../../composables/useAiRootNodes', () => ({
	useAiRootNodes: () => ref([{ name: 'Darwin', type: '@n8n/n8n-nodes-langchain.agent' }]),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () =>
		ref({
			workflowId: 'wf-1',
			allNodes: [
				{ name: 'Darwin', type: '@n8n/n8n-nodes-langchain.agent' },
				{ name: 'ToolA', type: 'tool' },
			],
			connectionsBySourceNode: {
				ToolA: { ai_tool: [[{ node: 'Darwin', type: 'ai_tool', index: 0 }]] },
			},
		}),
}));

const mockPersistAndRunCase = vi.fn().mockResolvedValue(true);
const mockSaveCase = vi.fn().mockResolvedValue(true);
const mockDeleteCase = vi.fn().mockResolvedValue(true);
const mockIsPersisting = ref(false);

vi.mock('../../composables/useTestCasePersistence', () => ({
	useTestCasePersistence: () => ({
		persistAndRunCase: mockPersistAndRunCase,
		saveCase: mockSaveCase,
		deleteCase: mockDeleteCase,
		runAll: vi.fn().mockResolvedValue(true),
		isPersisting: mockIsPersisting,
	}),
}));

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution: vi.fn().mockResolvedValue(null) }),
}));

// Stub heavy children not under test.
vi.mock('./TestCaseRunResult.vue', () => ({
	default: {
		name: 'TestCaseRunResult',
		props: ['index', 'expanded', 'separated'],
		template: '<div :data-test-id="`stub-run-result-${index}`" />',
	},
}));

// ─── Renderer ────────────────────────────────────────────────────────────────

const renderComponent = createComponentRenderer(TestCaseDetail);

function setup() {
	createTestingPinia({ stubActions: false });
	return useEvaluationsWizardSidepanelStore();
}

describe('TestCaseDetail', () => {
	beforeEach(() => {
		mockPersistAndRunCase.mockReset().mockResolvedValue(true);
		mockSaveCase.mockReset().mockResolvedValue(true);
		mockDeleteCase.mockReset().mockResolvedValue(true);
		mockIsPersisting.value = false;
	});

	it('renders the node (read-only, suite-level) and the input field as a sentence', () => {
		const store = setup();
		store.aiNodeName = 'Darwin';
		const { getByTestId } = renderComponent();
		// Node is configured at suite level — shown read-only here, not a dropdown.
		expect(getByTestId('tests-detail-ai-node')).toBeInTheDocument();
		expect(getByTestId('tests-detail-input-query')).toBeInTheDocument();
	});

	it('runs the case when Run is clicked', async () => {
		setup();
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('tests-detail-run'));
		expect(mockPersistAndRunCase).toHaveBeenCalledWith('initial');
	});

	// The Config pane's collapse state lives on the reka-ui CollapsibleContent
	// wrapping our config content.
	function configPaneState(container: Element): string | null | undefined {
		return container
			.querySelector('[data-test-id="tests-detail-config"]')
			?.closest('[data-state]')
			?.getAttribute('data-state');
	}

	it('collapses the Config pane once a run dispatches successfully', async () => {
		setup();
		const { getByTestId, container } = renderComponent();
		expect(configPaneState(container)).toBe('open');

		await userEvent.click(getByTestId('tests-detail-run'));

		// handleRun collapses Config only after persistAndRunCase resolves true.
		await waitFor(() => expect(configPaneState(container)).toBe('closed'));
	});

	it('leaves the Config pane open when the run fails to dispatch', async () => {
		setup();
		mockPersistAndRunCase.mockResolvedValueOnce(false);
		const { getByTestId, container } = renderComponent();

		await userEvent.click(getByTestId('tests-detail-run'));

		// Let the (failed) handler settle, then confirm Config was never collapsed —
		// otherwise the user is stranded on a closed pane with no result to show.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(configPaneState(container)).toBe('open');
	});

	it('returns to the list when the breadcrumb root is clicked', async () => {
		const store = setup();
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('tests-detail-breadcrumb-root'));
		expect(store.viewMode).toBe('list');
	});

	it('flushes a pending edit before starting a new case', async () => {
		const store = setup();
		store.aiNodeName = 'Darwin';
		// Editing an existing row, with other rows present so the "add case" CTA shows.
		store.setActiveRow(1, 10);
		store.datasetInputsByRow = [{ query: 'a' }, { query: 'b' }];
		const { getByTestId } = renderComponent();

		// Make an edit so a debounced auto-save is pending.
		const textarea = getByTestId('tests-detail-input-query').querySelector('textarea');
		await userEvent.type(textarea as HTMLElement, 'x');

		await userEvent.click(getByTestId('tests-detail-create-case'));

		// The pending edit is flushed (saved against the current row) before the
		// view switches, so the queued save can't re-insert it as a stray row once
		// the new case sets activeRowIndex to null.
		expect(mockSaveCase).toHaveBeenCalledWith({ silent: true });
		expect(store.viewMode).toBe('create');
	});

	it('renders the correctness metric with an expected-answer field by default', () => {
		const store = setup();
		store.selectedMetricKeys = ['correctness'];
		const { getByTestId } = renderComponent();
		expect(getByTestId('tests-detail-metric-correctness')).toBeInTheDocument();
		expect(getByTestId('tests-detail-expected-expectedAnswer')).toBeInTheDocument();
	});

	it('does not offer per-case metric editing (suite-level)', () => {
		const store = setup();
		store.selectedMetricKeys = ['correctness'];
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('tests-detail-metric-remove-correctness')).toBeNull();
		expect(queryByTestId('tests-detail-add-metric')).toBeNull();
	});

	it('renders a custom metric expression read-only', () => {
		const store = setup();
		store.customChecks = [{ id: 'c1', name: 'Custom 1', expression: '$json.x > 1' }];
		const { getByTestId, getByText } = renderComponent();
		expect(getByTestId('tests-detail-custom-c1')).toBeInTheDocument();
		expect(getByText('$json.x > 1')).toBeInTheDocument();
	});

	it('shows the latest-run pane when the pinned run covers the case', async () => {
		const store = setup();
		const evaluationStore = useEvaluationStore();
		store.setActiveRow(2, 20);
		store.setActiveRunId('run-1');
		// The pinned run has this row's execution → pane visible, keyed by row index.
		evaluationStore.testCaseExecutionsById = {
			c1: { id: 'c1', testRunId: 'run-1', runIndex: 2, status: 'success' },
		} as never;
		const { findByTestId } = renderComponent();
		expect(await findByTestId('stub-run-result-2')).toBeInTheDocument();
	});

	it('hides the latest-run pane when the pinned run has no execution for this case', () => {
		const store = setup();
		const evaluationStore = useEvaluationStore();
		// The pinned run ran row 0 only...
		evaluationStore.testRunsById = { 'run-1': { id: 'run-1', status: 'success' } } as never;
		evaluationStore.testCaseExecutionsById = {
			c0: { id: 'c0', testRunId: 'run-1', runIndex: 0, status: 'success' },
		} as never;
		// ...but we navigated to row 1 (whose sticky activeRunId is still run-1).
		store.setActiveRow(1, 11);
		store.setActiveRunId('run-1');
		const { queryByTestId } = renderComponent();
		// No empty pane, no false "running" — the run didn't cover this case.
		expect(queryByTestId('tests-detail-results')).toBeNull();
	});

	it('shows the latest-run pane while a run is dispatching for this case', async () => {
		const store = setup();
		store.setActiveRow(0, 10);
		const { getByTestId, findByTestId } = renderComponent();
		// No execution seeded yet; the dispatch flag keeps the pane visible so the
		// "running" state shows before the first poll lands the execution.
		await userEvent.click(getByTestId('tests-detail-run'));
		expect(await findByTestId('tests-detail-results')).toBeInTheDocument();
	});

	it('does not show the latest-run pane before a run is triggered', () => {
		setup();
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('tests-detail-results')).toBeNull();
	});

	it('shows connected tools as checkboxes for the tool-usage metric and toggles them', async () => {
		const store = setup();
		store.aiNodeName = 'Darwin';
		store.selectedMetricKeys = ['toolsUsed'];
		const { getByTestId } = renderComponent();

		const tool = getByTestId('tests-detail-tool-ToolA');
		expect(tool).toBeInTheDocument();

		await userEvent.click(tool);
		expect(store.expectedValues.expectedTools).toBe('ToolA');
	});
});
