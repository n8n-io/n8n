import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EvaluationConfigDto, EvaluationMetric, LlmJudgeMetricPreset } from '@n8n/api-types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import type { CustomCheck, JudgeSelection } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';

import { useRootStore } from '@n8n/stores/useRootStore';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
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

// Matches the dataset trigger's row cap (see EvaluationTrigger), so the wizard
// hydrates the same set of rows the run iterates over.
const MAX_DATASET_ROWS = 1000;

const CANNED_METRIC_KEYS = new Set<CannedMetricKey>([
	'correctness',
	'helpfulness',
	'stringSimilarity',
	'categorization',
	'toolsUsed',
]);

export function useWizardHydration() {
	const wizardStore = useEvaluationsWizardSidepanelStore();
	const evaluationStore = useEvaluationStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsStore = useWorkflowsStore();
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
		// A new/unsaved workflow has no persisted config to load; calling the API
		// with its placeholder id 404s ("Workflow not found") and surfaces a
		// spurious error toast. Start blank instead.
		if (workflowsStore.isNewWorkflow) return;

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
						{ take: MAX_DATASET_ROWS },
					);
					applyDatasetRowsToStore(rows.data);
				} catch (error) {
					console.warn('[evaluations wizard] failed to hydrate dataset rows', error);
				}
			}

			await restoreLastRun(workflowId);
		} catch (error) {
			toast.showError(error, locale.baseText('evaluations.wizardSidepanel.hydrate.error'));
		} finally {
			isHydrating.value = false;
		}
	}

	// On a fresh (re)open of a configured eval, land on the results pane showing
	// the most recent run instead of step 0. Skips when the user is already
	// mid-flow (past step 0) or has a run pinned this session — e.g. after
	// "Edit evals", which sends them to step 0 but keeps the run pinned.
	async function restoreLastRun(workflowId: string): Promise<void> {
		if (wizardStore.activeStep !== 0 || wizardStore.activeRunId) return;
		try {
			await evaluationStore.fetchTestRuns(workflowId);
			const runs = [...(evaluationStore.testRunsByWorkflowId[workflowId] ?? [])].sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			);
			const latest = runs[runs.length - 1];
			if (!latest) return;
			wizardStore.setActiveRunId(latest.id);
			wizardStore.setStep(3);
		} catch (error) {
			console.warn('[evaluations wizard] failed to restore last run', error);
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

	function applyDatasetRowsToStore(rows: Array<Record<string, unknown>>) {
		// Per-row expected values keep each result case mapped to its own dataset
		// row (by `runIndex`). The first row additionally seeds the Step-2 form's
		// inputs/expected fields.
		wizardStore.datasetExpectedByRow = rows.map((row) => splitDatasetRow(row).expected);
		const first = rows[0];
		if (!first) return;
		const { inputs, expected } = splitDatasetRow(first);
		wizardStore.inputs = inputs;
		wizardStore.expectedValues = expected;
	}

	return { hydrate, isHydrating };
}

// Splits a data table row into the expected-output columns (matched against the
// canned metrics' field names) and the remaining input columns. The synthetic
// id/timestamp columns are dropped.
function splitDatasetRow(row: Record<string, unknown>): {
	inputs: Record<string, string>;
	expected: Record<string, string>;
} {
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
	return { inputs, expected };
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
