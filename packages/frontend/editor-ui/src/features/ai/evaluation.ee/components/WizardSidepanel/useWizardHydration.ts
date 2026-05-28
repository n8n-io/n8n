import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EvaluationConfigDto, EvaluationMetric, LlmJudgeMetricPreset } from '@n8n/api-types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import type { CustomScorer, JudgeSelection } from '../../wizardSidepanel.store';

import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useToast } from '@/app/composables/useToast';
import { getDataTableRowsApi } from '@/features/core/dataTable/dataTable.api';
import { listEvaluationConfigs } from '../../evaluation.api';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { CANNED_METRIC_EXPECTED_FIELDS, type CannedMetricKey } from '../../evaluation.constants';

// Reverse map of the chathub→langchain table that lives in
// buildEvaluationConfigDto.ts. We can't import that table (it's private to
// the module) but it's tiny; mirroring the inverse here is cheaper than
// exposing the forward map. Keys use the camelCase form that
// `ChatHubLLMProvider` expects so they round-trip through the typed store.
const NODE_TYPE_TO_CHATHUB_PROVIDER: Record<string, JudgeSelection['provider']> = {
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': 'openai',
	'@n8n/n8n-nodes-langchain.lmChatAnthropic': 'anthropic',
	'@n8n/n8n-nodes-langchain.lmChatGoogleGemini': 'google',
	'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi': 'azureOpenAi',
	'@n8n/n8n-nodes-langchain.lmChatAwsBedrock': 'awsBedrock',
	'@n8n/n8n-nodes-langchain.lmChatOllama': 'ollama',
	'@n8n/n8n-nodes-langchain.lmChatVercelAiGateway': 'vercelAiGateway',
};

const CANNED_METRIC_KEYS = new Set<CannedMetricKey>([
	'correctness',
	'helpfulness',
	'stringSimilarity',
	'categorization',
	'toolsUsed',
]);

// On wizard open, re-hydrate the store from the latest persisted
// EvaluationConfig for this workflow (plus the first row of its data table).
// Returns a `hydrate()` function so callers control when it runs — the
// composable doesn't auto-subscribe to `isOpen` to keep ordering clear
// (open → reset → hydrate).
export function useWizardHydration() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();
	const aiRootNodes = useAiRootNodes();
	const toast = useToast();
	const locale = useI18n();

	const isHydrating = ref(false);

	async function hydrate(): Promise<void> {
		if (isHydrating.value) return;
		const wf = workflowDocumentStore.value;
		const workflowId = wf?.workflowId;
		const projectId = wf?.homeProject?.id;
		if (!workflowId || !projectId) return;

		isHydrating.value = true;
		try {
			const configs = await listEvaluationConfigs(rootStore.restApiContext, workflowId);
			// `Evaluation: <workflow name>` is what the wizard always writes — but
			// the user could in theory have other configs. Prefer one matching the
			// canonical name; otherwise take the most recently updated.
			const canonical = `Evaluation: ${wf.name ?? 'workflow'}`.slice(0, 128);
			const config = configs.find((c) => c.name === canonical) ?? configs[configs.length - 1];
			if (!config) return;

			applyConfigToStore(config);

			if (config.datasetSource === 'data_table') {
				try {
					const rows = await getDataTableRowsApi(
						rootStore.restApiContext,
						config.datasetRef.dataTableId,
						projectId,
						{ take: 1 },
					);
					const row = rows.data[0];
					if (row) applyDatasetRowToStore(row);
				} catch (error) {
					// Row fetch is a soft fail — the metrics & slice are still
					// hydrated above, and step 2 already has its own empty-state
					// for missing dataset rows.
					// eslint-disable-next-line no-console
					console.warn('[evaluations wizard] failed to hydrate dataset row', error);
				}
			}
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.hydrate.error'));
		} finally {
			isHydrating.value = false;
		}
	}

	function applyConfigToStore(config: EvaluationConfigDto) {
		const cannedKeys: CannedMetricKey[] = [];
		const judgeByMetric: Partial<Record<CannedMetricKey, JudgeSelection>> = {};
		const customScorers: Array<Omit<CustomScorer, 'id'>> = [];

		for (const metric of config.metrics) {
			const asCanned = decodeCannedMetric(metric);
			if (asCanned) {
				cannedKeys.push(asCanned.key);
				if (asCanned.judge) judgeByMetric[asCanned.key] = asCanned.judge;
				continue;
			}
			const asCustom = decodeCustomScorer(metric);
			if (asCustom) customScorers.push(asCustom);
		}

		wizardStore.selectedMetricKeys = cannedKeys;
		wizardStore.judgeSelectionByMetric = judgeByMetric;
		wizardStore.customScorers = [];
		for (const scorer of customScorers) wizardStore.addCustomScorer(scorer);

		// Slice / AI-node mode: if the saved end node is one of the workflow's
		// current AI root nodes, prefer single-AI-node mode — that's the simpler
		// affordance the user picks by default and what they'd see again on
		// reopen. Otherwise fall back to slice mode with the explicit names.
		const aiNodeNames = new Set(aiRootNodes.value.map((n) => n.name));
		if (aiNodeNames.has(config.endNodeName)) {
			wizardStore.aiNodeName = config.endNodeName;
			wizardStore.isSliceMode = false;
			wizardStore.startNodeName = '';
			wizardStore.endNodeName = '';
		} else {
			wizardStore.aiNodeName = '';
			wizardStore.isSliceMode = true;
			wizardStore.startNodeName = config.startNodeName;
			wizardStore.endNodeName = config.endNodeName;
		}
	}

	function applyDatasetRowToStore(row: Record<string, unknown>) {
		const inputs: Record<string, string> = {};
		const expected: Record<string, string> = {};
		const expectedFieldNames = new Set(
			Object.values(CANNED_METRIC_EXPECTED_FIELDS).map((f) => f.name),
		);
		for (const [key, value] of Object.entries(row)) {
			// Ignore data-table bookkeeping columns (id/createdAt/updatedAt).
			if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
			const stringified = stringifyValue(value);
			if (expectedFieldNames.has(key)) expected[key] = stringified;
			else inputs[key] = stringified;
		}
		wizardStore.inputs = inputs;
		wizardStore.expectedValues = expected;
	}

	return { hydrate, isHydrating };
}

type CannedDecode = { key: CannedMetricKey; judge?: JudgeSelection };

function decodeCannedMetric(metric: EvaluationMetric): CannedDecode | undefined {
	// We tag canned metrics by setting `metric.name` to the CannedMetricKey at
	// build time. Use that as the discriminator instead of inferring from
	// `type`, which is ambiguous (e.g. `llm_judge` covers both canned presets
	// AND a custom-defined LLM judge).
	const name = metric.name;
	if (!isCannedMetricKey(name)) return undefined;

	if (metric.type === 'llm_judge' && (name === 'correctness' || name === 'helpfulness')) {
		const preset: LlmJudgeMetricPreset = metric.config.preset;
		if (preset !== name) return undefined;
		const provider = NODE_TYPE_TO_CHATHUB_PROVIDER[metric.config.provider];
		if (!provider) return { key: name };
		return {
			key: name,
			judge: {
				provider,
				credentialId: metric.config.credentialId,
				model: metric.config.model,
			},
		};
	}
	if (metric.type === 'string_similarity' && name === 'stringSimilarity') return { key: name };
	if (metric.type === 'categorization' && name === 'categorization') return { key: name };
	if (metric.type === 'tools_used' && name === 'toolsUsed') return { key: name };
	return undefined;
}

function decodeCustomScorer(metric: EvaluationMetric): Omit<CustomScorer, 'id'> | undefined {
	if (metric.type === 'expression') {
		return {
			name: metric.name,
			expression: metric.config.expression,
		};
	}
	// Any other metric type that isn't a canned key is silently dropped —
	// the wizard only round-trips canned metrics and expression custom
	// scorers. A user-named `llm_judge` saved by an older build would land
	// here; we leave it on the backend untouched but don't surface it.
	return undefined;
}

function isCannedMetricKey(name: string): name is CannedMetricKey {
	return CANNED_METRIC_KEYS.has(name as CannedMetricKey);
}

function stringifyValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return '';
	}
}
