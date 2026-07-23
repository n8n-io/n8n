import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import TestsPanel from './TestsPanel.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import type * as SliceInputsModule from '../../composables/useSliceInputs';

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

// Stub the children so the shell test only asserts branching.
vi.mock('./TestCaseList.vue', () => ({
	default: { name: 'TestCaseList', template: '<div data-test-id="stub-list" />' },
}));
vi.mock('./TestCaseDetail.vue', () => ({
	default: { name: 'TestCaseDetail', template: '<div data-test-id="stub-detail" />' },
}));
vi.mock('./TestCaseResults.vue', () => ({
	default: { name: 'TestCaseResults', template: '<div data-test-id="stub-results" />' },
}));

const mockSliceInputs = ref({
	fieldNames: [] as string[],
	values: {} as Record<string, string>,
	hasExecution: false,
});
vi.mock('../../composables/useSliceInputs', async (importOriginal) => ({
	...(await importOriginal<typeof SliceInputsModule>()),
	useSliceInputs: () => mockSliceInputs,
}));

const mockAiRootNodes = ref<Array<{ name: string; type: string }>>([
	{ name: 'Darwin', type: 'agent' },
]);
vi.mock('../../composables/useAiRootNodes', () => ({
	useAiRootNodes: () => mockAiRootNodes,
}));

const mockRunWorkflow = vi.fn();
const mockRunTriggerNode = vi.fn();
const mockTriggerNodes = ref<Array<{ name: string; type: string }>>([
	{ name: 'Trigger', type: 'manualTrigger' },
]);
vi.mock('../../composables/useRunEvalWorkflow', () => ({
	useRunEvalWorkflow: () => ({
		runWorkflow: mockRunWorkflow,
		runTriggerNode: mockRunTriggerNode,
		triggerNodes: mockTriggerNodes,
	}),
}));

const mockOpenTriggerCreator = vi.fn();
const mockOpenRegularCreator = vi.fn();
vi.mock('@/features/shared/nodeCreator/nodeCreator.store', () => ({
	useNodeCreatorStore: () => ({
		openNodeCreatorForTriggerNodes: mockOpenTriggerCreator,
		openNodeCreatorForRegularNodes: mockOpenRegularCreator,
	}),
}));

vi.mock('../../composables/useDefaultJudgeSelection', () => ({
	useDefaultJudgeSelection: () => ref(null),
}));

const mockHydrate = vi.fn().mockResolvedValue(undefined);
vi.mock('../WizardSidepanel/useWizardHydration', () => ({
	useWizardHydration: () => ({ hydrate: mockHydrate }),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ref({ workflowId: 'wf-1', allNodes: [] }),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: () => ({ push: vi.fn() }),
		useRoute: () => ({ name: 'NodeView', params: { workflowId: 'wf-1' } }),
	};
});

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => 'wf-1'),
		useRouteWorkflowId: () => computed(() => 'wf-1'),
	};
});

const mockFetchLastSuccessfulExecution = vi.fn().mockResolvedValue(undefined);
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		fetchLastSuccessfulExecution: mockFetchLastSuccessfulExecution,
		isNewWorkflow: false,
	}),
}));

const mockFetchExecutions = vi.fn().mockResolvedValue({ results: [] });
const mockFetchExecution = vi.fn().mockResolvedValue(null);
vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({
		fetchExecutions: mockFetchExecutions,
		fetchExecution: mockFetchExecution,
	}),
}));

// ─── Test setup ──────────────────────────────────────────────────────────────

const renderComponent = createComponentRenderer(TestsPanel);

function setup() {
	createTestingPinia({ stubActions: false });
	return {
		wizardStore: useEvaluationsWizardSidepanelStore(),
		focusPanelStore: useFocusPanelStore(),
	};
}

describe('TestsPanel', () => {
	beforeEach(() => {
		mockSliceInputs.value = { fieldNames: [], values: {}, hasExecution: false };
		mockAiRootNodes.value = [{ name: 'Darwin', type: 'agent' }];
		mockTriggerNodes.value = [{ name: 'Trigger', type: 'manualTrigger' }];
		mockRunWorkflow.mockReset();
		mockRunTriggerNode.mockReset();
		mockOpenTriggerCreator.mockReset();
		mockOpenRegularCreator.mockReset();
		mockFetchExecutions.mockReset().mockResolvedValue({ results: [] });
		mockFetchLastSuccessfulExecution.mockReset().mockResolvedValue(undefined);
	});

	it('renders the probe-loading state before the probe completes (panel closed)', () => {
		setup();
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('tests-panel-probe-loading')).toBeInTheDocument();
		expect(queryByTestId('stub-list')).toBeNull();
		expect(queryByTestId('stub-detail')).toBeNull();
	});

	it('renders the results list when a config exists and viewMode is list', () => {
		const { wizardStore } = setup();
		wizardStore.datasetInputsByRow = [{ query: 'a' }];
		wizardStore.viewMode = 'list';
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('stub-results')).toBeInTheDocument();
		expect(queryByTestId('tests-panel-gate')).toBeNull();
		expect(queryByTestId('tests-panel-probe-loading')).toBeNull();
	});

	it('renders the execution picker when viewMode is create', () => {
		const { wizardStore } = setup();
		wizardStore.datasetInputsByRow = [{ query: 'a' }];
		wizardStore.viewMode = 'create';
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('stub-list')).toBeInTheDocument();
		expect(queryByTestId('stub-results')).toBeNull();
	});

	it('renders the detail when a config exists and viewMode is detail', () => {
		const { wizardStore } = setup();
		wizardStore.datasetInputsByRow = [{ query: 'a' }];
		wizardStore.viewMode = 'detail';
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('stub-detail')).toBeInTheDocument();
		expect(queryByTestId('stub-results')).toBeNull();
	});

	it('renders the gate once the probe completes with no run and no config', async () => {
		const { focusPanelStore } = setup();
		focusPanelStore.setSelectedTab('evaluations');
		focusPanelStore.openFocusPanel();

		const { findByTestId } = renderComponent();
		expect(await findByTestId('tests-panel-gate')).toBeInTheDocument();
	});

	it('shows the add-node empty state when the workflow has no AI node', () => {
		mockAiRootNodes.value = [];
		setup();
		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('tests-panel-add-node')).toBeInTheDocument();
		expect(queryByTestId('tests-panel-gate')).toBeNull();
		expect(queryByTestId('tests-panel-probe-loading')).toBeNull();
	});

	it('opens the node creator from the add-node empty state', async () => {
		mockAiRootNodes.value = [];
		mockTriggerNodes.value = [{ name: 'Trigger', type: 'manualTrigger' }];
		setup();
		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('tests-panel-add-node-button'));
		// A workflow that already has a trigger opens the regular node creator.
		expect(mockOpenRegularCreator).toHaveBeenCalled();
	});

	it('offers Execute workflow when there is a single trigger', async () => {
		const { focusPanelStore } = setup();
		focusPanelStore.setSelectedTab('evaluations');
		focusPanelStore.openFocusPanel();

		const { findByTestId, queryByTestId } = renderComponent();
		const runButton = await findByTestId('tests-panel-gate-run');
		expect(queryByTestId('tests-panel-choose-trigger')).toBeNull();
		await userEvent.click(runButton);
		expect(mockRunWorkflow).toHaveBeenCalled();
	});

	it('offers a trigger picker when there are multiple triggers', async () => {
		mockTriggerNodes.value = [
			{ name: 'Trigger A', type: 'manualTrigger' },
			{ name: 'Trigger B', type: 'webhook' },
		];
		const { focusPanelStore } = setup();
		focusPanelStore.setSelectedTab('evaluations');
		focusPanelStore.openFocusPanel();

		const { findByTestId, queryByTestId } = renderComponent();
		expect(await findByTestId('tests-panel-choose-trigger')).toBeInTheDocument();
		expect(queryByTestId('tests-panel-gate-run')).toBeNull();
	});

	it('applies a pending seed execution after opening, then clears it', async () => {
		const { wizardStore, focusPanelStore } = setup();
		focusPanelStore.setSelectedTab('evaluations');
		focusPanelStore.openFocusPanel();
		wizardStore.setAiNodeName('Darwin');
		wizardStore.setPendingSeedExecution({
			id: 'exec-9',
			data: {
				resultData: { runData: { Darwin: [{ data: { main: [[{ json: { response: 'hi' } }]] } }] } },
			},
		} as never);

		renderComponent();
		await new Promise((r) => setTimeout(r, 0));

		expect(wizardStore.seedExecution?.id).toBe('exec-9');
		expect(wizardStore.viewMode).toBe('detail');
		expect(wizardStore.activeRowIndex).toBeNull();
		// Consumed exactly once so a later remount doesn't re-seed.
		expect(wizardStore.pendingSeedExecution).toBeNull();
	});
});
