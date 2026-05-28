import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import EvaluationsWizardSidepanel from './EvaluationsWizardSidepanel.vue';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { CANNED_METRICS } from '../../evaluation.constants';

const mockAllNodes = ref<Array<{ name: string; type: string }>>([]);
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return 'workflow-id';
			},
			get allNodes() {
				return mockAllNodes.value;
			},
		},
	}),
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

const mockSliceInputs = ref({
	fieldNames: [] as string[],
	values: {} as Record<string, string>,
	hasExecution: true,
});
vi.mock('../../composables/useSliceInputs', () => ({
	useSliceInputs: () => mockSliceInputs,
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

// Per-node-type outputs override for sub-node filtering tests. Returning
// `undefined` matches the default test pinia behaviour (no registered types)
// — `isSubNodeType` then treats the node as non-sub and the slice picker
// shows it. Tests that need filtering set this to a map.
const mockNodeTypeOutputs = ref<Record<string, string[]>>({});
vi.mock('@/app/stores/nodeTypes.store', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		useNodeTypesStore: () => ({
			isTriggerNode: (type: string) => type.includes('Trigger'),
			getNodeType: (type: string) => {
				const outputs = mockNodeTypeOutputs.value[type];
				return outputs ? { outputs } : undefined;
			},
		}),
	};
});

const renderComponent = createComponentRenderer(EvaluationsWizardSidepanel);

describe('EvaluationsWizardSidepanel', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		mockAllNodes.value = [];
		mockNodeTypeOutputs.value = {};
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

	it('renders every canned metric option from the Set Metrics operation', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		for (const metric of CANNED_METRICS) {
			expect(getByTestId(`evaluations-wizard-sidepanel-metric-${metric.key}`)).toBeInTheDocument();
		}
	});

	it('toggles selection when a scorer card is clicked', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-metric-correctness'));
		expect(store.selectedMetricKeys).toContain('correctness');

		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-metric-correctness'));
		expect(store.selectedMetricKeys).not.toContain('correctness');
	});

	it('shows the AI-node picker by default on step 2', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		mockAllNodes.value = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];

		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-ai-node-picker')).toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-ai-node-select')).toBeInTheDocument();
		expect(queryByTestId('evaluations-wizard-sidepanel-slice-picker')).not.toBeInTheDocument();
	});

	it('defaults aiNodeName to the first AI root node when step 2 opens', () => {
		const store = useEvaluationsWizardSidepanelStore();
		mockAllNodes.value = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Pre-processing', type: 'n8n-nodes-base.set' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
			{ name: 'Chain LLM', type: '@n8n/n8n-nodes-langchain.chainLlm' },
		];
		store.open(1);

		renderComponent();
		expect(store.aiNodeName).toBe('AI Agent');
	});

	it('swaps to the slice picker after Extend to a slice and back via Reset', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		mockAllNodes.value = [
			{ name: 'When clicking ‘Test workflow’', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		store.open(1);

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
		mockAllNodes.value = [
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
		mockNodeTypeOutputs.value = {
			'n8n-nodes-base.manualTrigger': ['main'],
			'n8n-nodes-base.set': ['main'],
			'@n8n/n8n-nodes-langchain.agent': ['main'],
			'@n8n/n8n-nodes-langchain.lmChatOpenAi': ['ai_languageModel'],
		};
		store.open(1);

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

	it('closes when the Cancel button is clicked', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-cancel'));

		expect(store.isOpen).toBe(false);
	});

	it('advances from Step 1 to Step 2 when Next is clicked and a scorer is selected', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		// stringSimilarity is a non-LLM-judge metric — no model picker required,
		// so the Next button enables purely on selection.
		store.selectedMetricKeys = ['stringSimilarity'];

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-next'));

		expect(store.activeStep).toBe(1);
		expect(store.isOpen).toBe(true);
	});

	// Regression: previously Cancel and Next shared identical visual styling
	// because the wrong prop name (`type` instead of `variant`) was used; the
	// user often clicked Cancel by mistake. Verify they do distinct things.
	it('Next advances the step but does NOT close the wizard, unlike Cancel', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		// stringSimilarity is a non-LLM-judge metric — no model picker required,
		// so the Next button enables purely on selection.
		store.selectedMetricKeys = ['stringSimilarity'];

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

	it('shows Back instead of Cancel on Step 2 and returns to Step 1', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);

		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('evaluations-wizard-sidepanel-cancel')).not.toBeInTheDocument();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-back'));
		expect(store.activeStep).toBe(0);
		expect(store.isOpen).toBe(true);
	});

	it('disables Next on Step 1 when no scorer is selected', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeDisabled();
	});

	it('enables Next on Step 1 when only a custom scorer is added (no canned metric)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.addCustomScorer({
			name: 'Has output',
			expression: '$json.output.length > 0',
		});

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeEnabled();
	});

	it('disables Next when an LLM-judge metric is selected but no model is picked', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.selectedMetricKeys = ['correctness'];

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeDisabled();
	});

	it('enables Next once an LLM-judge metric has a model picked', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.selectedMetricKeys = ['correctness'];
		store.setJudgeSelection('correctness', {
			provider: 'openai',
			credentialId: 'cred-1',
			model: 'gpt-4o-mini',
		});

		const { getByTestId } = renderComponent();
		expect(getByTestId('evaluations-wizard-sidepanel-next')).toBeEnabled();
	});

	it('shows loading skeletons on Step 3 while the run is in progress', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(2);
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
		store.open(2);
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

	it('swaps loading for results once the run completes', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const evalStore = useEvaluationStore();
		store.open(2);
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

		const { getByTestId, queryByTestId } = renderComponent();
		expect(queryByTestId('evaluations-wizard-sidepanel-loading-skeletons')).not.toBeInTheDocument();
		expect(queryByTestId('evaluations-wizard-sidepanel-running')).not.toBeInTheDocument();
		expect(getByTestId('evaluations-wizard-sidepanel-results')).toBeInTheDocument();
	});

	it('shows the Done button on Step 3 and closes the wizard', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(2);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-done'));

		expect(store.isOpen).toBe(false);
	});

	it('opens the custom scorer modal when the + New custom scorer CTA is clicked', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);

		const { getByTestId, findByTestId } = renderComponent();
		await userEvent.click(getByTestId('evaluations-wizard-sidepanel-new-custom-scorer'));

		expect(store.isCustomScorerModalOpen).toBe(true);
		// Verify the modal actually rendered (and didn't silently mount as an empty wrapper).
		// findByTestId waits for the dialog portal to attach. If the dialog content fails
		// to render — e.g. because the slot tree is malformed — this will throw.
		await findByTestId('evaluations-wizard-sidepanel-custom-scorer-modal');
	});

	it('renders added custom scorers in the scorer list and removes them on click', async () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.addCustomScorer({
			name: 'Has output',
			expression: '{{ $json.output.length > 0 }}',
		});
		const id = store.customScorers[0].id;

		const { getByTestId, queryByTestId } = renderComponent();
		expect(getByTestId(`evaluations-wizard-sidepanel-custom-scorer-${id}`)).toBeInTheDocument();

		await userEvent.click(getByTestId(`evaluations-wizard-sidepanel-custom-scorer-remove-${id}`));
		expect(store.customScorers).toHaveLength(0);
		expect(
			queryByTestId(`evaluations-wizard-sidepanel-custom-scorer-${id}`),
		).not.toBeInTheDocument();
	});
});
