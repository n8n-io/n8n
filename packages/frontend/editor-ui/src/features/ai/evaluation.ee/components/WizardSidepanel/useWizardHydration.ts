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
	getCanonicalEvaluationName,
	LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER,
	TEST_CASE_NAME_COLUMN,
	type CannedMetricKey,
} from '../../evaluation.constants';
import { stringifyValue } from '../../evaluation.utils';

// Matches the dataset trigger's row cap (see EvaluationTrigger), so the wizard
// hydrates the same set of rows the run iterates over.
const MAX_DATASET_ROWS = 1000;

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
	// Dedupe concurrent hydrate() calls onto one promise, keyed by the workflow it
	// runs for. A call for a different workflow must NOT reuse an in-flight run —
	// that would resolve without hydrating the new workflow and let the old run's
	// rows land on it.
	let inFlight: Promise<void> | null = null;
	let inFlightWorkflowId: string | undefined;

	async function hydrate(): Promise<void> {
		const workflowId = workflowDocumentStore.value?.workflowId;
		if (inFlight && inFlightWorkflowId === workflowId) {
			await inFlight;
			return;
		}
		inFlightWorkflowId = workflowId;
		inFlight = doHydrate().finally(() => {
			if (inFlightWorkflowId === workflowId) {
				inFlight = null;
				inFlightWorkflowId = undefined;
			}
		});
		await inFlight;
	}

	async function doHydrate(): Promise<void> {
		const wf = workflowDocumentStore.value;
		const workflowId = wf?.workflowId;
		const projectId = wf?.homeProject?.id;
		if (!workflowId || !projectId) return;

		if (workflowsStore.isNewWorkflow) return;

		const isStale = () => workflowDocumentStore.value?.workflowId !== workflowId;

		isHydrating.value = true;
		try {
			const configs = await listEvaluationConfigs(rootStore.restApiContext, workflowId);
			if (isStale()) return;
			const canonical = getCanonicalEvaluationName(wf.name);
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
					if (isStale()) return;
					applyDatasetRowsToStore(rows.data);
				} catch (error) {
					console.warn('[evaluations wizard] failed to hydrate dataset rows', error);
				}
			}

			if (isStale()) return;
			await restoreLastRun(workflowId, isStale);
		} catch (error) {
			// A failure for a workflow the user already navigated away from must not
			// surface a toast on the now-active workflow.
			if (!isStale()) {
				toast.showError(error, locale.baseText('evaluations.wizardSidepanel.hydrate.error'));
			}
		} finally {
			isHydrating.value = false;
		}
	}

	async function restoreLastRun(workflowId: string, isStale: () => boolean): Promise<void> {
		if (wizardStore.activeStep !== 0 || wizardStore.activeRunId) return;
		try {
			await evaluationStore.fetchTestRuns(workflowId);
			// A workflow switch during the fetch must not pin this (now previous)
			// workflow's run onto the newly-active pane.
			if (isStale()) return;
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
		const split = rows.map((row) => splitDatasetRow(row));
		wizardStore.datasetExpectedByRow = split.map((s) => s.expected);
		wizardStore.datasetInputsByRow = split.map((s) => s.inputs);
		wizardStore.datasetNamesByRow = split.map((s) => s.name);
		const first = split[0];
		if (!first) return;
		wizardStore.inputs = first.inputs;
		wizardStore.expectedValues = first.expected;
		// `caseName` is per-active-row and owned by `openDetail`. Seeding it from
		// row 0 here would clobber the open case's name when a late hydrate resolves,
		// and the next auto-save would then persist that wrong (empty) name.
	}

	return { hydrate, isHydrating };
}

// Splits a data table row into the expected-output columns (matched against the
// canned metrics' field names), the reserved case-name column, and the remaining
// input columns. The synthetic id/timestamp columns are dropped.
function splitDatasetRow(row: Record<string, unknown>): {
	inputs: Record<string, string>;
	expected: Record<string, string>;
	name: string;
} {
	const inputs: Record<string, string> = {};
	const expected: Record<string, string> = {};
	let name = '';
	const expectedFieldNames = new Set(
		Object.values(CANNED_METRIC_EXPECTED_FIELDS).map((f) => f.name),
	);
	for (const [key, value] of Object.entries(row)) {
		if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
		const stringified = stringifyValue(value);
		if (key === TEST_CASE_NAME_COLUMN) name = stringified;
		else if (expectedFieldNames.has(key)) expected[key] = stringified;
		else inputs[key] = stringified;
	}
	return { inputs, expected, name };
}

type CannedDecode = { key: CannedMetricKey; judge?: JudgeSelection };

function decodeCannedMetric(metric: EvaluationMetric): CannedDecode | undefined {
	// Classify by the metric's own discriminator (llm_judge preset / metric type),
	// not by `metric.name`. `name` is a free-form human label — a config created
	// outside the wizard (by the agent or the API) may name a helpfulness judge
	// "Valid Markdown", so it can't identify the canned metric.
	if (metric.type === 'llm_judge') {
		const preset: LlmJudgeMetricPreset = metric.config.preset;
		if (preset !== 'correctness' && preset !== 'helpfulness') return undefined;
		const provider = LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER[metric.config.provider];
		if (!provider) return { key: preset };
		return {
			key: preset,
			judge: {
				provider,
				credentialId: metric.config.credentialId,
				model: metric.config.model,
			},
		};
	}
	if (metric.type === 'string_similarity') return { key: 'stringSimilarity' };
	if (metric.type === 'categorization') return { key: 'categorization' };
	if (metric.type === 'tools_used') return { key: 'toolsUsed' };
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
