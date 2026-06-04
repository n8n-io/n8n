import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EvaluationConfigDto, EvaluationMetric, LlmJudgeMetricPreset } from '@n8n/api-types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import type { CustomCheck, JudgeSelection } from '../../wizardSidepanel.store';

import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useToast } from '@/app/composables/useToast';
import { getDataTableRowsApi } from '@/features/core/dataTable/dataTable.api';
import { listEvaluationConfigs } from '../../evaluation.api';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import {
	CANNED_METRIC_EXPECTED_FIELDS,
	LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER,
	type CannedMetricKey,
} from '../../evaluation.constants';
import { stringifyValue } from '../../evaluation.utils';

const CANNED_METRIC_KEYS = new Set<CannedMetricKey>([
	'correctness',
	'helpfulness',
	'stringSimilarity',
	'categorization',
	'toolsUsed',
]);

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
		const customChecks: Array<Omit<CustomCheck, 'id'>> = [];

		for (const metric of config.metrics) {
			const asCanned = decodeCannedMetric(metric);
			if (asCanned) {
				cannedKeys.push(asCanned.key);
				if (asCanned.judge) judgeByMetric[asCanned.key] = asCanned.judge;
				continue;
			}
			const asCustom = decodeCustomCheck(metric);
			if (asCustom) customChecks.push(asCustom);
		}

		wizardStore.selectedMetricKeys = cannedKeys;
		wizardStore.judgeSelectionByMetric = judgeByMetric;
		wizardStore.customChecks = [];
		for (const check of customChecks) wizardStore.addCustomCheck(check);

		// Prefer single-AI-node mode when the saved end node still matches an
		// AI root node; fall back to explicit slice names otherwise.
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
	// Discriminate on `name` rather than `type` — `llm_judge` covers both
	// canned presets and user-defined judges.
	const name = metric.name;
	if (!isCannedMetricKey(name)) return undefined;

	if (metric.type === 'llm_judge' && (name === 'correctness' || name === 'helpfulness')) {
		const preset: LlmJudgeMetricPreset = metric.config.preset;
		if (preset !== name) return undefined;
		const provider = LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER[metric.config.provider];
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

function decodeCustomCheck(metric: EvaluationMetric): Omit<CustomCheck, 'id'> | undefined {
	if (metric.type === 'expression') {
		return {
			name: metric.name,
			expression: metric.config.expression,
		};
	}
	return undefined;
}

function isCannedMetricKey(name: string): name is CannedMetricKey {
	return CANNED_METRIC_KEYS.has(name as CannedMetricKey);
}
