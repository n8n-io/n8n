<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { EvaluationMetric, UpsertEvaluationConfigDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useEvaluationStore } from '../evaluation.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { VIEWS } from '@/app/constants';

import MetricFormModal from '../components/ConfigForm/MetricFormModal.vue';
import MetricSummaryRow from '../components/ConfigForm/MetricSummaryRow.vue';

// Default name used for the workflow's primary config until multi-config UI lands.
const DEFAULT_CONFIG_NAME = 'Default';

const props = defineProps<{
	workflowId: string;
}>();

const locale = useI18n();
const toast = useToast();

const workflowsStore = useWorkflowsStore();
const workflowState = useWorkflowState();
const evaluationStore = useEvaluationStore();
const dataTableStore = useDataTableStore();
const projectsStore = useProjectsStore();
const executionsStore = useExecutionsStore();
const router = useRouter();

function navigateToRuns() {
	void router.push({
		name: VIEWS.EVALUATION_EDIT,
		params: { workflowId: props.workflowId },
	});
}

const configId = ref<string | null>(null);
const configName = ref<string>(DEFAULT_CONFIG_NAME);
const dataTableId = ref<string>('');
const startNodeName = ref<string>('');
const endNodeName = ref<string>('');
const metrics = ref<EvaluationMetric[]>([]);
const saving = ref(false);
const running = ref(false);
const creatingDataset = ref(false);

const metricModalOpen = ref(false);
const metricModalMode = ref<'add' | 'edit'>('add');
const editingIndex = ref<number | null>(null);
const metricModalSeed = ref<EvaluationMetric | null>(null);

const availableNodes = computed(() =>
	workflowsStore.getNodes().map((node) => ({ name: node.name })),
);

const dataTableOptions = computed(() =>
	dataTableStore.dataTables.map((table) => ({ id: table.id, name: table.name })),
);

const canSave = computed(
	() =>
		dataTableId.value.length > 0 &&
		startNodeName.value.length > 0 &&
		endNodeName.value.length > 0 &&
		metrics.value.length > 0 &&
		!saving.value,
);

const canRun = computed(() => configId.value !== null && !saving.value && !running.value);

function populateFromExistingConfig() {
	const configs = evaluationStore.configsByWorkflowId[props.workflowId] ?? [];
	const config = configs[0] ?? null;
	if (!config) {
		configId.value = null;
		configName.value = DEFAULT_CONFIG_NAME;
		dataTableId.value = '';
		startNodeName.value = '';
		endNodeName.value = '';
		metrics.value = [];
		return;
	}
	configId.value = config.id;
	configName.value = config.name;
	if (config.datasetSource === 'data_table') {
		dataTableId.value = config.datasetRef.dataTableId;
	}
	startNodeName.value = config.startNodeName;
	endNodeName.value = config.endNodeName;
	metrics.value = config.metrics;
}

async function fetchDataTables() {
	const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
	if (!projectId) return;
	try {
		await dataTableStore.fetchDataTables(projectId, 1, 100);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.config.error.loadFailed'));
	}
}

async function fetchConfigs() {
	if (evaluationStore.configsByWorkflowId[props.workflowId]) return;
	try {
		await evaluationStore.fetchEvaluationConfigs(props.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.config.error.loadFailed'));
	}
}

async function hydrateLatestExecution() {
	const existing = workflowsStore.workflowExecutionData;
	if (existing && existing.workflowId === props.workflowId) return;

	try {
		const list = await executionsStore.fetchExecutions({
			workflowId: props.workflowId,
			status: ['success'],
		});
		const latest = list?.results?.[0];
		if (!latest) return;

		const full = await executionsStore.fetchExecution(latest.id);
		if (full) workflowState.setWorkflowExecutionData(full);
	} catch {
		// Non-fatal — autocomplete will just lack data.
	}
}

function sampleForNode(nodeName: string): Record<string, unknown> | null {
	const pinned = workflowsStore.workflow?.pinData?.[nodeName]?.[0]?.json;
	if (pinned && typeof pinned === 'object') return pinned as Record<string, unknown>;

	const runData = workflowsStore.getWorkflowRunData;
	const nodeRuns = runData?.[nodeName];
	const executed = nodeRuns?.[0]?.data?.main?.[0]?.[0]?.json;
	if (executed && typeof executed === 'object') return executed as Record<string, unknown>;

	return null;
}

function inferStartNodeInputSample(): Record<string, unknown> | null {
	if (!startNodeName.value) return null;

	const incomingEdges =
		workflowsStore.connectionsByDestinationNode[startNodeName.value]?.main ?? [];
	const upstreamNames = incomingEdges.flatMap((bucket) => (bucket ?? []).map((edge) => edge.node));

	for (const upstream of upstreamNames) {
		const sample = sampleForNode(upstream);
		if (sample) return sample;
	}

	return sampleForNode(startNodeName.value);
}

function inferColumnType(value: unknown): 'string' | 'number' | 'boolean' | 'date' {
	if (typeof value === 'number') return 'number';
	if (typeof value === 'boolean') return 'boolean';
	if (value instanceof Date) return 'date';
	if (typeof value === 'string') {
		const asDate = Date.parse(value);
		if (!Number.isNaN(asDate) && /\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
	}
	return 'string';
}

async function createDatasetFromStartNode() {
	if (!startNodeName.value || creatingDataset.value) return;

	const sample = inferStartNodeInputSample();
	if (!sample || Object.keys(sample).length === 0) {
		toast.showMessage({
			type: 'warning',
			title: locale.baseText('evaluations.config.dataset.noSampleTitle'),
			message: locale.baseText('evaluations.config.dataset.noSampleMessage'),
		});
		return;
	}

	const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
	if (!projectId) return;

	const columns = Object.entries(sample).map(([colName, value]) => ({
		name: colName,
		type: inferColumnType(value),
	}));
	const workflowName = workflowsStore.workflow?.name ?? 'Workflow';
	const workflowIdShort = props.workflowId.slice(0, 8);
	const datasetName = `Eval — ${workflowName} (${workflowIdShort})`;

	creatingDataset.value = true;
	try {
		const created = await dataTableStore.createDataTable(datasetName, projectId, columns);
		dataTableId.value = created.id;
		toast.showMessage({
			type: 'success',
			title: locale.baseText('evaluations.config.dataset.createdTitle'),
			message: locale.baseText('evaluations.config.dataset.createdMessage', {
				interpolate: { count: columns.length.toString() },
			}),
		});
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.config.dataset.createError'));
	} finally {
		creatingDataset.value = false;
	}
}

async function save() {
	if (!canSave.value) return;
	saving.value = true;
	try {
		const payload: UpsertEvaluationConfigDto = {
			name: configName.value.trim() || DEFAULT_CONFIG_NAME,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: dataTableId.value },
			startNodeName: startNodeName.value,
			endNodeName: endNodeName.value,
			metrics: metrics.value,
		};
		const saved = configId.value
			? await evaluationStore.updateEvaluationConfig(props.workflowId, configId.value, payload)
			: await evaluationStore.createEvaluationConfig(props.workflowId, payload);
		configId.value = saved.id;
		toast.showMessage({
			type: 'success',
			title: locale.baseText('evaluations.config.saved'),
		});
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.config.error.saveFailed'));
	} finally {
		saving.value = false;
	}
}

async function runEvaluation() {
	if (!configId.value || !canRun.value) return;
	running.value = true;
	try {
		await evaluationStore.startConfigTestRun(props.workflowId, configId.value);
		toast.showMessage({
			type: 'success',
			title: locale.baseText('evaluations.config.runStarted'),
		});
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.config.error.runFailed'));
	} finally {
		running.value = false;
	}
}

function openMetricModal(
	seed: EvaluationMetric | null,
	mode: 'add' | 'edit',
	index: number | null,
) {
	metricModalMode.value = mode;
	metricModalSeed.value = seed;
	editingIndex.value = index;
	metricModalOpen.value = true;
}

function startAddMetric() {
	openMetricModal(null, 'add', null);
}

function startEditMetric(index: number) {
	openMetricModal(metrics.value[index], 'edit', index);
}

function removeMetric(index: number) {
	metrics.value = metrics.value.filter((_, i) => i !== index);
}

function handleMetricSave(metric: EvaluationMetric) {
	if (metricModalMode.value === 'edit' && editingIndex.value !== null) {
		const next = [...metrics.value];
		next[editingIndex.value] = metric;
		metrics.value = next;
	} else {
		metrics.value = [...metrics.value, metric];
	}
}

onMounted(async () => {
	await Promise.all([fetchConfigs(), fetchDataTables(), hydrateLatestExecution()]);
	populateFromExistingConfig();
});

watch(
	() => evaluationStore.configsByWorkflowId[props.workflowId],
	() => {
		populateFromExistingConfig();
	},
);
</script>

<template>
	<div :class="$style.view">
		<div :class="$style.container">
			<header :class="$style.header">
				<div>
					<N8nHeading size="large" tag="h2">
						{{ locale.baseText('evaluations.config.title') }}
					</N8nHeading>
					<N8nText size="small" color="text-light" :class="$style.subtitle">
						{{ locale.baseText('evaluations.config.subtitle') }}
					</N8nText>
				</div>
				<div :class="$style.headerActions">
					<N8nButton
						variant="subtle"
						size="medium"
						icon="list"
						data-test-id="evaluation-config-view-runs"
						:label="locale.baseText('evaluations.config.viewRuns')"
						@click="navigateToRuns"
					/>
					<N8nButton
						variant="outline"
						size="medium"
						icon="play"
						data-test-id="evaluation-config-run"
						:label="locale.baseText('evaluations.config.run')"
						:disabled="!canRun"
						:loading="running"
						@click="runEvaluation"
					/>
					<N8nButton
						variant="solid"
						size="medium"
						data-test-id="evaluation-config-save"
						:label="locale.baseText('evaluations.config.save')"
						:disabled="!canSave"
						:loading="saving"
						@click="save"
					/>
				</div>
			</header>

			<div :class="$style.field">
				<N8nInputLabel :label="locale.baseText('evaluations.config.dataset')" :bold="false">
					<div :class="$style.datasetRow">
						<N8nSelect
							v-model="dataTableId"
							size="medium"
							:placeholder="locale.baseText('evaluations.config.datasetPlaceholder')"
						>
							<N8nOption
								v-for="table in dataTableOptions"
								:key="table.id"
								:label="table.name"
								:value="table.id"
							/>
						</N8nSelect>
						<N8nButton
							variant="subtle"
							size="medium"
							icon="plus"
							:disabled="!startNodeName || creatingDataset"
							:loading="creatingDataset"
							:label="locale.baseText('evaluations.config.dataset.create')"
							:title="
								!startNodeName
									? locale.baseText('evaluations.config.dataset.createFromStartNodeHint')
									: ''
							"
							@click="createDatasetFromStartNode"
						/>
					</div>
				</N8nInputLabel>
			</div>

			<div :class="$style.startEndRow">
				<div :class="$style.field">
					<N8nInputLabel :label="locale.baseText('evaluations.config.start')" :bold="false">
						<N8nSelect v-model="startNodeName" size="medium">
							<N8nOption
								v-for="node in availableNodes"
								:key="node.name"
								:label="node.name"
								:value="node.name"
							/>
						</N8nSelect>
					</N8nInputLabel>
				</div>

				<N8nIcon icon="arrow-right" :class="$style.arrow" />

				<div :class="$style.field">
					<N8nInputLabel :label="locale.baseText('evaluations.config.end')" :bold="false">
						<N8nSelect v-model="endNodeName" size="medium">
							<N8nOption
								v-for="node in availableNodes"
								:key="node.name"
								:label="node.name"
								:value="node.name"
							/>
						</N8nSelect>
					</N8nInputLabel>
				</div>
			</div>

			<N8nCard :class="$style.metricsCard">
				<template #header>
					<N8nText :bold="true" size="medium">
						{{ locale.baseText('evaluations.config.metrics') }}
					</N8nText>
					<N8nIconButton
						icon="plus"
						type="tertiary"
						size="small"
						data-test-id="evaluation-config-add-metric"
						:title="locale.baseText('evaluations.config.addMetric')"
						@click="startAddMetric"
					/>
				</template>

				<div v-if="metrics.length === 0" :class="$style.emptyState">
					<div :class="$style.emptyIcon">
						<N8nIcon icon="flask-conical" />
					</div>
					<N8nText :bold="true" size="medium">
						{{ locale.baseText('evaluations.config.metrics.emptyTitle') }}
					</N8nText>
					<N8nText size="small" color="text-light" :class="$style.emptyDescription">
						{{ locale.baseText('evaluations.config.metrics.emptyDescription') }}
					</N8nText>
				</div>

				<ul v-else :class="$style.metricsList">
					<li v-for="(metric, index) in metrics" :key="metric.id">
						<MetricSummaryRow
							:metric="metric"
							@edit="startEditMetric(index)"
							@remove="removeMetric(index)"
						/>
					</li>
				</ul>
			</N8nCard>

			<MetricFormModal
				v-if="metricModalOpen"
				:mode="metricModalMode"
				:metric="metricModalSeed"
				:end-node-name="endNodeName"
				@update:open="metricModalOpen = $event"
				@save="handleMetricSave"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: var(--spacing--lg);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 720px;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.subtitle {
	display: block;
	margin-top: var(--spacing--3xs);
}

.headerActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.datasetRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: stretch;

	> :first-child {
		flex: 1;
		min-width: 0;
	}
}

.startEndRow {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--2xs);

	> .field {
		flex: 1;
	}
}

.arrow {
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--2xs);
}

.metricsCard {
	--card--padding: 0;
	align-items: stretch;

	:global([data-test-id='card-content']) {
		justify-content: flex-start;
	}

	:global([data-test-id='card-content']) > div:first-child {
		padding: var(--spacing--xs) var(--spacing--sm);
		border-bottom: var(--border);
	}
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xl) var(--spacing--md);
	text-align: center;
}

.emptyIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--3xs);
}

.emptyDescription {
	max-width: 320px;
}

.metricsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	margin: 0;
	list-style: none;
}
</style>
