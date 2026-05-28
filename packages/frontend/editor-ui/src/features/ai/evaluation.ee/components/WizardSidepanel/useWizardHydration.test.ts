import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { EvaluationConfigDto } from '@n8n/api-types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

const mockAllNodes = ref<Array<{ name: string; type: string }>>([]);
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
				return mockAllNodes.value;
			},
		},
	}),
	createWorkflowDocumentId: (id: string) => id,
	useWorkflowDocumentStore: () => ({}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

// useFocusPanelStore drags in NDV / settings parameter chains we don't need here.
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

const showError = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const listEvaluationConfigs = vi.fn();
vi.mock('../../evaluation.api', () => ({
	listEvaluationConfigs: (...args: unknown[]) => listEvaluationConfigs(...args),
}));

const getDataTableRowsApi = vi.fn();
vi.mock('@/features/core/dataTable/dataTable.api', () => ({
	getDataTableRowsApi: (...args: unknown[]) => getDataTableRowsApi(...args),
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
		mockAllNodes.value = [
			{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Pre-process', type: 'n8n-nodes-base.set' },
			{ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent' },
		];
		listEvaluationConfigs.mockReset();
		getDataTableRowsApi.mockReset();
		showError.mockReset();
	});

	it('decodes a canned correctness metric back into selectedMetricKeys + judgeSelection', async () => {
		listEvaluationConfigs.mockResolvedValue([
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
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

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
		listEvaluationConfigs.mockResolvedValue([
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
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual(['stringSimilarity']);
		expect(store.judgeSelectionByMetric.stringSimilarity).toBeUndefined();
	});

	it('decodes a custom expression scorer into customScorers', async () => {
		listEvaluationConfigs.mockResolvedValue([
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
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual([]);
		expect(store.customScorers).toHaveLength(1);
		expect(store.customScorers[0]).toMatchObject({
			name: 'Length check',
			expression: '={{ $json.output.length }}',
		});
	});

	it('drops a non-canned LLM judge metric — those are no longer surfaced in the wizard', async () => {
		listEvaluationConfigs.mockResolvedValue([
			makeConfig({
				metrics: [
					{
						id: 'm',
						name: 'My LLM scorer',
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
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.customScorers).toEqual([]);
		expect(store.selectedMetricKeys).toEqual([]);
	});

	it('uses single-AI-node mode when endNodeName matches an AI root node', async () => {
		listEvaluationConfigs.mockResolvedValue([
			makeConfig({ startNodeName: 'Pre-process', endNodeName: 'AI Agent' }),
		]);
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.aiNodeName).toBe('AI Agent');
		expect(store.isSliceMode).toBe(false);
		expect(store.startNodeName).toBe('');
		expect(store.endNodeName).toBe('');
	});

	it('falls back to slice mode when endNodeName is not an AI root node', async () => {
		listEvaluationConfigs.mockResolvedValue([
			makeConfig({ startNodeName: 'Pre-process', endNodeName: 'Post-process' }),
		]);
		getDataTableRowsApi.mockResolvedValue({ count: 0, data: [] });

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.isSliceMode).toBe(true);
		expect(store.startNodeName).toBe('Pre-process');
		expect(store.endNodeName).toBe('Post-process');
		expect(store.aiNodeName).toBe('');
	});

	it('splits a dataset row into inputs vs expectedValues', async () => {
		listEvaluationConfigs.mockResolvedValue([
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
		getDataTableRowsApi.mockResolvedValue({
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

	it('does nothing when there is no existing config', async () => {
		listEvaluationConfigs.mockResolvedValue([]);

		const store = useEvaluationsWizardSidepanelStore();
		const { hydrate } = useWizardHydration();
		await hydrate();

		expect(store.selectedMetricKeys).toEqual([]);
		expect(store.customScorers).toEqual([]);
		expect(getDataTableRowsApi).not.toHaveBeenCalled();
	});
});
