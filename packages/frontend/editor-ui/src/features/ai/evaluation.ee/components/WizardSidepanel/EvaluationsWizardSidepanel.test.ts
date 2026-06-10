import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref, shallowRef, nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsWizardSidepanel from './EvaluationsWizardSidepanel.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

// Plain mutable holders instead of module-scope `ref()`s — reactive refs
// surviving teardown have caused post-teardown rejections on Node 24.
type MockNode = {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	credentials?: Record<string, { id: string | null; name: string }>;
};
const { mocks } = vi.hoisted(() => ({
	mocks: {
		workflowId: 'workflow-id' as string,
		allNodes: [] as MockNode[],
		sliceInputs: {
			fieldNames: [] as string[],
			values: {} as Record<string, string>,
			hasExecution: true,
		},
		// Per-node-type outputs override for sub-node filtering tests. Undefined
		// matches the default test pinia behaviour — `isSubNodeType` then treats
		// the node as non-sub and the slice picker shows it.
		nodeTypeOutputs: {} as Record<string, string[]>,
	},
}));

// Reactive workflow document ref — allows tests to swap workflowId and have
// Vue's watch() in the component detect the change.
const workflowDocumentRef = shallowRef({
	get workflowId() {
		return mocks.workflowId;
	},
	get allNodes() {
		return mocks.allNodes;
	},
});

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => workflowDocumentRef,
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

const mockHydrate = vi.fn();
vi.mock('./useWizardHydration', () => ({
	useWizardHydration: () => ({ hydrate: mockHydrate, isHydrating: ref(false) }),
}));

vi.mock('../../composables/useSliceInputs', () => ({
	useSliceInputs: () => ref(mocks.sliceInputs),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => `mocked-${key}`,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/stores/nodeTypes.store', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useNodeTypesStore: () => ({
			isTriggerNode: (type: string) => type.includes('Trigger'),
			getNodeType: (type: string) => {
				const outputs = mocks.nodeTypeOutputs[type];
				return outputs ? { outputs } : undefined;
			},
		}),
	};
});

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runEntireWorkflow: vi.fn(),
	}),
}));

const trackMock = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

const mockRouterPush = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useRouter: () => ({
			push: mockRouterPush,
		}),
	};
});

const renderComponent = createComponentRenderer(EvaluationsWizardSidepanel);

describe('EvaluationsWizardSidepanel', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		mocks.workflowId = 'workflow-id';
		mocks.allNodes = [];
		mocks.nodeTypeOutputs = {};
		mocks.sliceInputs = { fieldNames: [], values: {}, hasExecution: true };
		mockRouterPush.mockReset();
		mockHydrate.mockReset();
		trackMock.mockReset();
		// Trigger Vue to re-read the shallowRef so watchers see the reset workflowId.
		workflowDocumentRef.value = {
			get workflowId() {
				return mocks.workflowId;
			},
			get allNodes() {
				return mocks.allNodes;
			},
		};
	});

	// The wizard now lives as a tab inside FocusSidebar — visibility is
	// controlled by the focus panel's tab selection, not by the wizard
	// component's own template. The component always renders when mounted; the
	// parent decides whether to mount it.
	it('renders the wizard content when mounted', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel')).toBeInTheDocument();
	});

	it('keeps the active step in sync with the store on open', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel')).toBeInTheDocument();
		expect(store.activeStep).toBe(0);
	});

	it('shows 4 progress segments', () => {
		const { getByTestId } = renderComponent();
		const progressBar = getByTestId('evaluations-wizard-sidepanel-progress');
		expect(progressBar.children).toHaveLength(4);
	});

	it('shows the AI-node picker by default on step 0 (Choose your test system)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		mocks.allNodes = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];

		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-ai-node-picker')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-ai-node-select')).toBeInTheDocument();
		expect(queryByTestId('evaluations-wizard-sidepanel-slice-picker')).not.toBeInTheDocument();
	});

	it('defaults aiNodeName to the first AI root node when step 0 opens', () => {
		const store = useEvaluationsWizardSidepanelStore();
		mocks.allNodes = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Pre-processing', type: 'n8n-nodes-base.set' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			{ name: 'Chain LLM', type: '@n8n/n8n-nodes-langchain.chainLlm' },
		];
		store.open(0);

		renderComponent();
		expect(store.aiNodeName).toBe('AI Agent');
	});

	it('swaps to the slice picker after "Select multiple nodes" and back via Reset', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		mocks.allNodes = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		store.open(0);

		const { getByTestId, queryByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-extend-to-slice'));
		expect(getByTestId('evaluations-wizard-sidepanel-slice-picker')).toBeInTheDocument();
		expect(store.isSliceMode).toBe(true);
		// End is pre-seeded from the AI node pick so the user keeps progress.
		expect(store.endNodeName).toBe('AI Agent');

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-reset-to-ai-node'));
		expect(queryByTestId('evaluations-wizard-sidepanel-slice-picker')).not.toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-ai-node-picker')).toBeInTheDocument();
		expect(store.isSliceMode).toBe(false);
	});

	it('filters AI sub-nodes (e.g. language models) out of the slice dropdowns', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		mocks.allNodes = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Edit Fields', type: 'n8n-nodes-base.set' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			},
		];
		// Only the chat model is a sub-node (no `main` output). Everything else
		// has a `main` output and remains pickable.
		mocks.nodeTypeOutputs = {
			'n8n-nodes-base.manualTrigger': ['main'],
			'n8n-nodes-base.set': ['main'],
			'@n8n/n8n-nodes-langchain.agent': ['main'],
			'@n8n/n8n-nodes-langchain.lmChatOpenAi': ['ai_languageModel'],
		};
		store.open(0);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-extend-to-slice'));

		// Element Plus's <el-select> teleports its dropdown to body, so the
		// options live outside the component's container. Each option carries
		// a Vue-internal class but no test id — assert against the rendered
		// document text instead. "AI Agent" is the seeded endNodeName so it
		// also appears as the field value; "Edit Fields" / "Trigger" only
		// surface in the dropdown list.
		const docHtml = document.body.innerHTML;
		expect(docHtml).toContain('Edit Fields');
		expect(docHtml).toContain('AI Agent');
		// The sub-node was filtered out — its name must not appear anywhere
		// the wizard renders (no dropdown row, no auto-pick).
		expect(docHtml).not.toContain('OpenAI Chat Model');
	});

	it('shows Correctness on step 1 and reveals the rest behind "Explore more checks"', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId, queryByTestId } = renderComponent();
		// Correctness is shown up front; the other built-ins and the custom-check
		// affordance are hidden initially.
		expect(getByTestId('evaluations-wizard-sidepanel-metric-correctness')).toBeInTheDocument();
		expect(queryByTestId('evaluations-wizard-sidepanel-metric-categorization')).toBeNull();
		expect(queryByTestId('evaluations-wizard-sidepanel-metric-toolsUsed')).toBeNull();
		expect(queryByTestId('evaluations-wizard-sidepanel-new-custom-check')).toBeNull();

		// Reveal the rest.
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-explore-more-checks'));
		expect(getByTestId('evaluations-wizard-sidepanel-metric-categorization')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-metric-toolsUsed')).toBeInTheDocument();
		// The custom-check affordance becomes available only after expanding.
		expect(getByTestId('evaluations-wizard-sidepanel-new-custom-check')).toBeInTheDocument();
		// The button disappears once expanded.
		expect(queryByTestId('evaluations-wizard-sidepanel-explore-more-checks')).toBeNull();

		// Helpfulness and String Similarity are never offered as built-in cards.
		expect(queryByTestId('evaluations-wizard-sidepanel-metric-helpfulness')).toBeNull();
		expect(queryByTestId('evaluations-wizard-sidepanel-metric-stringSimilarity')).toBeNull();
	});

	it('auto-reveals more checks when a hidden built-in is already selected', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		store.selectedMetricKeys = ['correctness', 'toolsUsed'];

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-metric-toolsUsed')).toBeInTheDocument();
	});

	it('toggles selection when a check card is clicked on step 1', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId } = renderComponent();
		// Correctness is pre-selected by default.
		expect(store.selectedMetricKeys).toContain('correctness');

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-metric-correctness'));
		expect(store.selectedMetricKeys).not.toContain('correctness');

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-metric-correctness'));
		expect(store.selectedMetricKeys).toContain('correctness');
	});

	it('closes when the Cancel button is clicked', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-cancel'));

		expect(store.isOpen).toBe(false);
	});

	it('advances from step 0 to step 1 when Next is clicked and a node is selected', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.setAiNodeName('AI Agent');

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-next'));

		expect(store.activeStep).toBe(1);
		expect(store.isOpen).toBe(true);
	});

	it('advances from step 1 to step 2 when Next is clicked and a check is selected', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		// stringSimilarity is a non-LLM-judge metric — no model picker required,
		// so the Next button enables purely on selection.
		store.selectedMetricKeys = ['stringSimilarity'];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-next'));

		expect(store.activeStep).toBe(2);
		expect(store.isOpen).toBe(true);
	});

	// Regression: previously Cancel and Next shared identical visual styling
	// because the wrong prop name (`type` instead of `variant`) was used; the
	// user often clicked Cancel by mistake. Verify they do distinct things.
	it('Next advances the step but does NOT close the wizard, unlike Cancel', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.setAiNodeName('AI Agent');

		const { getByTestId, findByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-next'));
		expect(store.isOpen).toBe(true);
		expect(store.activeStep).toBe(1);

		// Reset and confirm Cancel actually closes
		store.setStep(0);
		// findByTestId waits for the conditionally-rendered Cancel button
		// to reappear after the step changes.
		await userEvent.click(await findByTestId('evaluations-wizard-sidepanel-cancel'));
		expect(store.isOpen).toBe(false);
	});

	it('shows Back instead of Cancel on step 1 and returns to step 0', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('evaluations-wizard-sidepanel-cancel')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-back'));
		expect(store.activeStep).toBe(0);
		expect(store.isOpen).toBe(true);
	});

	it('shows Back on step 2 and returns to step 1', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(2);

		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('evaluations-wizard-sidepanel-cancel')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-back'));
		expect(store.activeStep).toBe(1);
		expect(store.isOpen).toBe(true);
	});

	it('disables Next on step 0 when no node is selected', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.setAiNodeName('');

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeDisabled();
	});

	it('enables Next on step 0 when an AI node is selected', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.setAiNodeName('AI Agent');

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeEnabled();
	});

	it('disables Next on step 1 when no check is selected', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeDisabled();
	});

	it('enables Next on step 1 when only a custom check is added (no canned metric)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		// Clear the default correctness pre-selection so only the custom check remains.
		store.selectedMetricKeys = [];
		store.addCustomCheck({
			name: 'Has output',
			expression: '$json.output.length > 0',
		});

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeEnabled();
	});

	it('disables Next when an LLM-judge metric is selected on step 1 but no model is picked', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		store.selectedMetricKeys = ['correctness'];

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeDisabled();
	});

	it('enables Next once an LLM-judge metric has a model picked on step 1', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		store.selectedMetricKeys = ['correctness'];
		store.setJudgeSelection('correctness', {
			provider: 'openai',
			credentialId: 'cred-1',
			model: 'gpt-4o-mini',
		});

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeEnabled();
	});

	// Verifies the wiring between useDefaultJudgeSelection and the wizard
	// store: when the wizard opens against a workflow that already has an
	// lmChat sub-node with a valid credential, every LLM-judge slot should be
	// pre-filled from that sub-node so the user doesn't have to repeat
	// themselves.
	it('seeds LLM-judge slots from the first lmChat sub-node when the wizard opens', () => {
		const store = useEvaluationsWizardSidepanelStore();
		mocks.allNodes = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-openai', name: 'OpenAI account' } },
			},
		];

		// Seed the credentials store so the composable's "credential must be
		// readable by the current user" gate passes.
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([
			{
				id: 'cred-openai',
				name: 'OpenAI',
				type: 'openAiApi',
				createdAt: '',
				updatedAt: '',
				scopes: [],
				homeProject: undefined,
				sharedWithProjects: [],
				isManaged: false,
			} as unknown as Parameters<typeof credentialsStore.setCredentials>[0][number],
		]);

		store.open(0);
		renderComponent();

		const expected = {
			provider: 'openai',
			credentialId: 'cred-openai',
			model: 'gpt-4o-mini',
		};
		expect(store.judgeSelectionByMetric.correctness).toEqual(expected);
		expect(store.judgeSelectionByMetric.helpfulness).toEqual(expected);
	});

	// Regression guard: if the user already picked a model for a metric, the
	// defaulting watcher must not clobber it on re-open or hydration.
	it('does NOT overwrite an LLM-judge slot the user (or hydration) already populated', () => {
		const store = useEvaluationsWizardSidepanelStore();
		mocks.allNodes = [
			{
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' } },
				credentials: { openAiApi: { id: 'cred-openai', name: 'OpenAI account' } },
			},
		];
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([
			{
				id: 'cred-openai',
				name: 'OpenAI',
				type: 'openAiApi',
				createdAt: '',
				updatedAt: '',
				scopes: [],
				homeProject: undefined,
				sharedWithProjects: [],
				isManaged: false,
			} as unknown as Parameters<typeof credentialsStore.setCredentials>[0][number],
		]);

		store.open(0);
		// User had previously picked Anthropic for correctness — the watcher
		// must respect that even though the workflow's sub-node is OpenAI.
		store.setJudgeSelection('correctness', {
			provider: 'anthropic',
			credentialId: 'cred-anthropic',
			model: 'claude-3-5-sonnet-20241022',
		});

		renderComponent();

		// Correctness preserved; helpfulness (empty slot) gets the workflow default.
		expect(store.judgeSelectionByMetric.correctness).toEqual({
			provider: 'anthropic',
			credentialId: 'cred-anthropic',
			model: 'claude-3-5-sonnet-20241022',
		});
		expect(store.judgeSelectionByMetric.helpfulness).toEqual({
			provider: 'openai',
			credentialId: 'cred-openai',
			model: 'gpt-4o-mini',
		});
	});

	it('shows loading skeletons on step 3 (Results) while the run is in progress', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(3);
		store.selectedMetricKeys = ['correctness', 'stringSimilarity'];
		evalStore.testRunsById = {
			'run-1': {
				id: 'run-1',
				workflowId: 'workflow-id',
				status: 'running',
				createdAt: '',
				updatedAt: '',
				runAt: '',
				completedAt: null,
			},
		};

		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-running')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-loading-skeletons')).toBeInTheDocument();
		// Results card list is hidden while the run is in flight.
		expect(queryByTestId('evaluations-wizard-sidepanel-results')).not.toBeInTheDocument();
	});

	it('treats the brief `new` status as in-progress (covers the queued window)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(3);
		store.selectedMetricKeys = ['correctness'];
		evalStore.testRunsById = {
			'run-1': {
				id: 'run-1',
				workflowId: 'workflow-id',
				status: 'new',
				createdAt: '',
				updatedAt: '',
				runAt: '',
				completedAt: null,
			},
		};

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-loading-skeletons')).toBeInTheDocument();
	});

	it('swaps loading for results once the run completes on step 3', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(3);
		store.selectedMetricKeys = ['correctness'];
		evalStore.testRunsById = {
			'run-1': {
				id: 'run-1',
				workflowId: 'workflow-id',
				status: 'success',
				metrics: { correctness: 0.9 },
				createdAt: '',
				updatedAt: '',
				runAt: '',
				completedAt: '',
			},
		};
		// A completed case feeds the case-centric results layout.
		evalStore.testCaseExecutionsById = {
			'case-1': {
				id: 'case-1',
				testRunId: 'run-1',
				executionId: null,
				status: 'success',
				createdAt: '',
				updatedAt: '',
				runAt: null,
				runIndex: 0,
				metrics: { correctness: 4 },
				inputs: { expectedAnswer: 'hi' },
				outputs: { output: 'hello' },
			},
		};

		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('evaluations-wizard-sidepanel-loading-skeletons')).not.toBeInTheDocument();
		expect(queryByTestId('evaluations-wizard-sidepanel-running')).not.toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-results')).toBeInTheDocument();
		// A per-check result card and one expandable case row render from the run data.
		expect(getByTestId('evaluations-wizard-sidepanel-result-card-correctness')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-case-1')).toBeInTheDocument();
	});

	it('tracks "User viewed evaluation results" once when a finished run renders on step 3', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(3);
		store.selectedMetricKeys = ['correctness'];
		evalStore.testRunsById = {
			'run-1': {
				id: 'run-1',
				workflowId: 'workflow-id',
				status: 'success',
				metrics: { correctness: 0.9 },
				createdAt: '',
				updatedAt: '',
				runAt: '',
				completedAt: '',
			},
		};
		evalStore.testCaseExecutionsById = {
			'case-1': {
				id: 'case-1',
				testRunId: 'run-1',
				executionId: null,
				status: 'success',
				createdAt: '',
				updatedAt: '',
				runAt: null,
				runIndex: 0,
				metrics: { correctness: 4 },
				inputs: { expectedAnswer: 'hi' },
				outputs: { output: 'hello' },
			},
		};

		renderComponent();
		await nextTick();

		const resultsEvents = trackMock.mock.calls.filter(
			([event]) => event === 'User viewed evaluation results',
		);
		expect(resultsEvents).toHaveLength(1);
		expect(resultsEvents[0][1]).toEqual({
			workflow_id: 'workflow-id',
			run_id: 'run-1',
			test_case_count: 1,
			metric_count: 1,
		});
	});

	it('does not track evaluation results while the run is still in progress on step 3', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(3);
		store.selectedMetricKeys = ['correctness'];
		evalStore.testRunsById = {
			'run-1': {
				id: 'run-1',
				workflowId: 'workflow-id',
				status: 'running',
				createdAt: '',
				updatedAt: '',
				runAt: '',
				completedAt: null,
			},
		};

		renderComponent();
		await nextTick();

		expect(
			trackMock.mock.calls.filter(([event]) => event === 'User viewed evaluation results'),
		).toHaveLength(0);
	});

	it('shows "View Results" button on step 3 and closes the wizard on click', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(3);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-view-results'));

		expect(store.isOpen).toBe(false);
	});

	it('"View Results" navigates to EVALUATION_RUNS_DETAIL when a runId is pinned', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(3);
		store.setActiveRunId('run-42');

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-view-results'));

		expect(mockRouterPush).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({ runId: 'run-42' }),
			}),
		);
		expect(store.isOpen).toBe(false);
	});

	it('shows "Run again" button on step 3', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(3);

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-run-again')).toBeInTheDocument();
	});

	it('opens the custom check modal when the + New custom check CTA is clicked on step 1', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId, findByTestId } = renderComponent();
		// The custom-check CTA only appears after expanding "Explore more checks".
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-explore-more-checks'));
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-new-custom-check'));

		expect(store.isCustomCheckModalOpen).toBe(true);
		// Verify the modal actually rendered (and didn't silently mount as an empty wrapper).
		await findByTestId('evaluations-wizard-sidepanel-custom-check-modal');
	});

	it('renders added custom checks in the check list and removes them on click', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		store.addCustomCheck({
			name: 'Has output',
			expression: '{{ $json.output.length > 0 }}',
		});
		const id = store.customChecks[0].id;

		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId(`evaluations-wizard-sidepanel-custom-check-${id}`)).toBeInTheDocument();

		await userEvent.click(getByTestId(`evaluations-wizard-sidepanel-custom-check-remove-${id}`));
		expect(store.customChecks).toHaveLength(0);
		expect(
			queryByTestId(`evaluations-wizard-sidepanel-custom-check-${id}`),
		).not.toBeInTheDocument();
	});

	describe('run-first gate', () => {
		it('blocks the wizard with a run-first gate when the workflow has never run', async () => {
			mocks.sliceInputs = { fieldNames: [], values: {}, hasExecution: false };
			const store = useEvaluationsWizardSidepanelStore();
			store.open(0);

			const { findByTestId, queryByTestId } = renderComponent();

			// Once the execution probe settles with no execution, the gate appears…
			await findByTestId('evaluations-wizard-sidepanel-gate');
			expect(queryByTestId('evaluations-wizard-sidepanel-gate-run')).toBeInTheDocument();
			// …and the wizard steps/footer are hidden.
			expect(queryByTestId('evaluations-wizard-sidepanel-progress')).toBeNull();
			expect(queryByTestId('evaluations-wizard-sidepanel-next')).toBeNull();
		});

		it('shows the wizard (not the gate) when an execution exists', () => {
			mocks.sliceInputs = { fieldNames: ['query'], values: { query: 'hi' }, hasExecution: true };
			const store = useEvaluationsWizardSidepanelStore();
			store.open(0);

			const { getByTestId, queryByTestId } = renderComponent();
			expect(getByTestId('evaluations-wizard-sidepanel-progress')).toBeInTheDocument();
			expect(queryByTestId('evaluations-wizard-sidepanel-gate')).toBeNull();
		});

		it('does not gate an existing eval (run pinned) even without a detectable execution', () => {
			// e.g. after "Edit evals": step 0 with the run still pinned, no fresh execution.
			mocks.sliceInputs = { fieldNames: [], values: {}, hasExecution: false };
			const store = useEvaluationsWizardSidepanelStore();
			store.setStep(0);
			store.setActiveRunId('run-1');

			const { getByTestId, queryByTestId } = renderComponent();
			expect(getByTestId('evaluations-wizard-sidepanel-progress')).toBeInTheDocument();
			expect(queryByTestId('evaluations-wizard-sidepanel-gate')).toBeNull();
		});
	});

	describe('workflow-switch watch', () => {
		it('calls reset() and hydrate() when workflowId changes between two real ids', async () => {
			const store = useEvaluationsWizardSidepanelStore();
			// Seed non-default state to verify it is cleared (correctness is on by default).
			store.setStep(2);
			store.toggleMetric('toolsUsed');

			mocks.workflowId = 'wf-1';
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};

			renderComponent();
			await nextTick();

			// Simulate switching to wf-2
			mocks.workflowId = 'wf-2';
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};
			await nextTick();

			expect(store.activeStep).toBe(0);
			// reset() restores the default pre-selection.
			expect(store.selectedMetricKeys).toEqual(['correctness']);
		});

		it('does NOT call reset() when prevId is the placeholder (new→saved transition)', async () => {
			const store = useEvaluationsWizardSidepanelStore();
			store.setStep(1);
			store.toggleMetric('toolsUsed');

			const NEW_WORKFLOW_ID = '__EMPTY__';
			mocks.workflowId = NEW_WORKFLOW_ID;
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};

			renderComponent();
			await nextTick();

			// Simulate save completing — id transitions from placeholder to a real id
			mocks.workflowId = 'wf-saved';
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};
			await nextTick();

			// State must NOT be reset when transitioning from the placeholder id
			expect(store.activeStep).toBe(1);
			expect(store.selectedMetricKeys).toEqual(['correctness', 'toolsUsed']);
		});

		it('resets across an unmount/remount on a different workflow (pane closed between workflows)', async () => {
			const store = useEvaluationsWizardSidepanelStore();

			// Pane first opens on wf-1 and reaches the results step with a run.
			mocks.workflowId = 'wf-1';
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};
			const first = renderComponent();
			await nextTick();
			store.setStep(3);
			store.toggleMetric('toolsUsed');
			store.setActiveRunId('run-from-wf-1');

			// The focus panel closes between workflows, so the pane unmounts. The
			// store (and its lastWorkflowId bookkeeping) survives.
			first.unmount();
			await nextTick();

			// User switches to wf-2 and re-opens the evaluations pane → fresh mount.
			mocks.workflowId = 'wf-2';
			workflowDocumentRef.value = {
				get workflowId() {
					return mocks.workflowId;
				},
				get allNodes() {
					return mocks.allNodes;
				},
			};
			renderComponent();
			await nextTick();

			expect(store.activeStep).toBe(0);
			expect(store.selectedMetricKeys).toEqual(['correctness']);
			expect(store.activeRunId).toBeNull();
		});
	});
});
