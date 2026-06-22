import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { EvaluationConfigDto } from '@n8n/api-types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

// Plain mutable holders instead of module-scope `ref()`s — reactive refs
// surviving teardown have caused post-teardown rejections on Node 24.
const { mocks } = vi.hoisted(() => ({
	mocks: {
		allNodes: [] as Array<{ name: string; type: string }>,
		isNewWorkflow: false,
		showError: vi.fn(),
		listEvaluationConfigs: vi.fn(),
		getDataTableRowsApi: vi.fn(),
		fetchTestRuns: vi.fn(),
		testRunsByWorkflowId: {} as Record<string, Array<{ id: string; createdAt: string }>>,
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			get workflowId() {
				return 'workflow-id';
			},
			get name() {
				return 'My Workflow';
			},
			get homeProject() {
				return { id: 'project-id' };
			},
			get allNodes() {
				return mocks.allNodes;
			},
		},
	}),
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		get isNewWorkflow() {
			return mocks.isNewWorkflow;
		},
	}),
}));

// Avoid activating the real focus-panel store: its watchers outlive the test
// and have surfaced as post-teardown unhandled rejections on Node 24.
vi.mock('@/app/stores/focusPanel.store', () => ({
	useFocusPanelStore: () => ({
		focusPanelActive: false,
		selectedTab: 'evaluations',
		openFocusPanel: vi.fn(),
		closeFocusPanel: vi.fn(),
		setSelectedTab: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));

vi.mock('../../evaluation.api', () => ({
	listEvaluationConfigs: (...args: unknown[]) => mocks.listEvaluationConfigs(...args),
}));

vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	getDataTableRowsApi: (...args: unknown[]) => mocks.getDataTableRowsApi(...args),
}));

vi.mock('../../evaluation.store', () => ({
	useEvaluationStore: () => ({
		fetchTestRuns: (...args: unknown[]) => mocks.fetchTestRuns(...args),
		get testRunsByWorkflowId() {
			return mocks.testRunsByWorkflowId;
		},
	}),
}));

import { useWizardHydration } from './useWizardHydration';

function makeConfig(overrides: Partial<EvaluationConfigDto> = {}): EvaluationConfigDto {
	return {
		id: 'config-id',
		workflowId: 'workflow-id',
		name: 'Evaluation: My Workflow',
		status: 'valid',
		invalidReason: null,
		startNodeName: 'Pre-process',
		endNodeName: 'AI Agent',
		metrics: [],
		datasetSource: 'data_table',
		datasetRef: { dataTableId: 'data-table-id' },
		...overrides,
	} as EvaluationConfigDto;
}

describe('useWizardHydration', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mocks.allNodes = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Pre-process', type: 'n8n-nodes-base.set' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		mocks.isNewWorkflow = false;
		mocks.listEvaluationConfigs.mockReset();
		mocks.getDataTableRowsApi.mockReset();
		mocks.getDataTableRowsApi.mockResolvedValue({ data: [] });
		mocks.showError.mockReset();
		mocks.fetchTestRuns.mockReset();
		mocks.fetchTestRuns.mockResolvedValue(undefined);
		mocks.testRunsByWorkflowId = {};
	});

	it('skips hydration for a new/unsaved workflow without calling the API or toasting', async () => {
		mocks.isNewWorkflow = true;

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(mocks.listEvaluationConfigs).not.toHaveBeenCalled();
		expect(mocks.showError).not.toHaveBeenCalled();
		// Skipping hydration leaves the store's default pre-selection untouched.
		expect(store.selectedMetricKeys).toEqual(['correctness']);
	});

	describe('restoring the last run', () => {
		it('jumps to the results step pinned to the most recent run', async () => {
			mocks.listEvaluationConfigs.mockResolvedValue([makeConfig()]);
			mocks.testRunsByWorkflowId = {
				'workflow-id': [
					{ id: 'run-old', createdAt: '2024-01-01T00:00:00.000Z' },
					{ id: 'run-new', createdAt: '2024-02-01T00:00:00.000Z' },
				],
			};

			const store = useEvaluationsWizardSidepanelStore();
			const { hydrate } = useWizardHydration();
			await hydrate();

			expect(mocks.fetchTestRuns).toHaveBeenCalledWith('workflow-id');
			expect(store.activeStep).toBe(3);
			expect(store.activeRunId).toBe('run-new');
		});

		it('stays on step 0 when the configured eval has no prior runs', async () => {
			mocks.listEvaluationConfigs.mockResolvedValue([makeConfig()]);
			mocks.testRunsByWorkflowId = {};

			const store = useEvaluationsWizardSidepanelStore();
			const { hydrate } = useWizardHydration();
			await hydrate();

			expect(store.activeStep).toBe(0);
			expect(store.activeRunId).toBeNull();
		});

		it('does not restore a run when the user is already past step 0', async () => {
			mocks.listEvaluationConfigs.mockResolvedValue([makeConfig()]);
			mocks.testRunsByWorkflowId = {
				'workflow-id': [{ id: 'run-1', createdAt: '2024-01-01T00:00:00.000Z' }],
			};

			const store = useEvaluationsWizardSidepanelStore();
			store.setStep(1);
			const { hydrate } = useWizardHydration();
			await hydrate();

			expect(mocks.fetchTestRuns).not.toHaveBeenCalled();
			expect(store.activeStep).toBe(1);
		});
	});

	it('decodes a canned correctness metric back into selectedMetricKeys + judgeSelection', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'metric-1',
						name: 'correctness',
						type: 'llm_judge',
						config: {
							preset: 'correctness',
							provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							credentialId: 'cred-1',
							model: 'gpt-4o-mini',
							outputType: 'numeric',
							inputs: { actualAnswer: '=', expectedAnswer: '=' },
						},
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual(['correctness']);
		expect(store.judgeSelectionByMetric.correctness).toEqual({
			provider: 'openai',
			credentialId: 'cred-1',
			model: 'gpt-4o-mini',
		});
	});

	it('decodes a deterministic canned metric (stringSimilarity)', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'stringSimilarity',
						type: 'string_similarity',
						config: { inputs: { actualAnswer: '=', expectedAnswer: '=' } },
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual(['stringSimilarity']);
		expect(store.judgeSelectionByMetric.stringSimilarity).toBeUndefined();
	});

	it('decodes a custom expression check into customChecks', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'Length check',
						type: 'expression',
						config: { expression: '={{ $json.output.length }}', outputType: 'numeric' },
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual([]);
		expect(store.customChecks).toHaveLength(1);
		expect(store.customChecks[0]).toMatchObject({
			name: 'Length check',
			expression: '={{ $json.output.length }}',
		});
	});

	it('drops a non-canned LLM judge metric — those are no longer surfaced in the wizard', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'My LLM check',
						type: 'llm_judge',
						config: {
							preset: 'helpfulness',
							provider: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
							credentialId: 'cred-anthropic',
							model: 'claude-opus',
							outputType: 'numeric',
							inputs: { actualAnswer: 'r', userQuery: 'q' },
						},
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.customChecks).toEqual([]);
		expect(store.selectedMetricKeys).toEqual([]);
	});

	it('uses single-AI-node mode when endNodeName matches an AI root node', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({ startNodeName: 'Pre-process', endNodeName: 'AI Agent' }),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.aiNodeName).toBe('AI Agent');
		expect(store.isSliceMode).toBe(false);
		expect(store.startNodeName).toBe('');
		expect(store.endNodeName).toBe('');
	});

	it('falls back to slice mode when endNodeName is not an AI root node', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({ startNodeName: 'Pre-process', endNodeName: 'Post-process' }),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.isSliceMode).toBe(true);
		expect(store.startNodeName).toBe('Pre-process');
		expect(store.endNodeName).toBe('Post-process');
		expect(store.aiNodeName).toBe('');
	});

	it('splits a dataset row into inputs vs expectedValues', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'correctness',
						type: 'llm_judge',
						config: {
							preset: 'correctness',
							provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							credentialId: 'c',
							model: 'm',
							outputType: 'numeric',
							inputs: { actualAnswer: '=', expectedAnswer: '=' },
						},
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({
			count: 1,
			data: [
				{
					id: 1,
					createdAt: 't',
					updatedAt: 't',
					query: 'hello',
					expectedAnswer: 'world',
				},
			],
		});

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.inputs).toEqual({ query: 'hello' });
		expect(store.expectedValues).toEqual({ expectedAnswer: 'world' });
	});

	it('hydrates expected values for every dataset row, indexed by position', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'correctness',
						type: 'llm_judge',
						config: {
							preset: 'correctness',
							provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							credentialId: 'c',
							model: 'm',
							outputType: 'numeric',
							inputs: { actualAnswer: '=', expectedAnswer: '=' },
						},
					},
				],
			}),
		]);
		mocks.getDataTableRowsApi.mockResolvedValue({
			count: 2,
			data: [
				{ id: 1, createdAt: 't', updatedAt: 't', query: 'q1', expectedAnswer: 'a1' },
				{ id: 2, createdAt: 't', updatedAt: 't', query: 'q2', expectedAnswer: 'a2' },
			],
		});

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		// First row still seeds the Step-2 form.
		expect(store.expectedValues).toEqual({ expectedAnswer: 'a1' });
		// Every row's expected values are kept, in dataset order, for the results pane.
		expect(store.datasetExpectedByRow).toEqual([
			{ expectedAnswer: 'a1' },
			{ expectedAnswer: 'a2' },
		]);
	});

	it('does nothing when there is no existing config', async () => {
		mocks.listEvaluationConfigs.mockResolvedValue([]);

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		// No config to load — the store keeps its default pre-selection.
		expect(store.selectedMetricKeys).toEqual(['correctness']);
		expect(store.customChecks).toEqual([]);
		expect(mocks.getDataTableRowsApi).not.toHaveBeenCalled();
	});
});
