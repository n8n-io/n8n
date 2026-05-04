<script lang="ts" setup>
import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nOption,
	N8nRadioButtons,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { fetchDataTablesApi } from '@/features/core/dataTable/dataTable.api';
import { useInstanceAiStore } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';

interface EvalsProposePayload {
	detectedAiNodes: string[];
	suggestedMetrics: InstanceAiEvalMetricProposal[];
}

type DatasetChoice = 'create-empty' | 'link-existing' | 'later';

const props = defineProps<{
	requestId: string;
	inputThreadId?: string;
	message?: string;
	workflowId?: string;
	projectId?: string;
	payload: EvalsProposePayload;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const rootStore = useRootStore();
const telemetry = useTelemetry();

const isSubmitted = ref(false);
const isDeferred = ref(false);

const enabledMetricIds = ref<Set<string>>(
	new Set(props.payload.suggestedMetrics.filter((m) => m.defaultEnabled).map((m) => m.id)),
);

const datasetChoice = ref<DatasetChoice>('create-empty');
const selectedDataTableId = ref<string>('');
const dataTables = ref<DataTable[]>([]);
const isLoadingDataTables = ref(false);
const dataTablesError = ref<string | null>(null);

const canLinkExisting = computed(() => Boolean(props.projectId));

const datasetOptions = computed(() => [
	{
		label: i18n.baseText('instanceAi.evalsPropose.dataset.createEmpty' as BaseTextKey),
		value: 'create-empty' as const,
	},
	{
		label: i18n.baseText('instanceAi.evalsPropose.dataset.linkExisting' as BaseTextKey),
		value: 'link-existing' as const,
		disabled: !canLinkExisting.value,
	},
	{
		label: i18n.baseText('instanceAi.evalsPropose.dataset.later' as BaseTextKey),
		value: 'later' as const,
	},
]);

const submitDisabled = computed(
	() => datasetChoice.value === 'link-existing' && !selectedDataTableId.value,
);

async function loadDataTables() {
	if (!props.projectId || dataTables.value.length > 0 || isLoadingDataTables.value) return;
	isLoadingDataTables.value = true;
	dataTablesError.value = null;
	try {
		const response = await fetchDataTablesApi(rootStore.restApiContext, props.projectId, {
			skip: 0,
			take: 100,
		});
		dataTables.value = response.data;
	} catch (error) {
		dataTablesError.value = error instanceof Error ? error.message : String(error);
	} finally {
		isLoadingDataTables.value = false;
	}
}

watch(datasetChoice, (next) => {
	if (next === 'link-existing') {
		void loadDataTables();
	} else {
		selectedDataTableId.value = '';
	}
});

function toggleMetric(metricId: string, checked: boolean) {
	const next = new Set(enabledMetricIds.value);
	if (checked) {
		next.add(metricId);
	} else {
		next.delete(metricId);
	}
	enabledMetricIds.value = next;
}

function trackInput(approved: boolean) {
	telemetry.track('User finished providing input', {
		thread_id: store.currentThreadId,
		input_thread_id: props.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'evals-propose',
		provided_inputs: approved
			? [
					{
						label: 'metrics',
						options: props.payload.suggestedMetrics.map((m) => m.id),
						option_chosen: Array.from(enabledMetricIds.value),
					},
					{
						label: 'dataset',
						options: ['create-empty', 'link-existing', 'later'],
						option_chosen: [datasetChoice.value],
					},
				]
			: [],
		skipped_inputs: approved ? [] : [{ label: 'evals-propose', options: [] }],
	});
}

async function handleSubmit() {
	if (store.resolvedConfirmationIds.has(props.requestId)) return;
	if (submitDisabled.value) return;

	trackInput(true);
	isSubmitted.value = true;
	isDeferred.value = false;

	const success = await store.confirmAction(props.requestId, {
		kind: 'evalsPropose',
		approved: true,
		enabledMetricIds: Array.from(enabledMetricIds.value),
		// 'create-empty' is the backend default; only forward explicit picks so the
		// resume payload matches the InstanceAiEvalsProposeResume schema enum.
		...(datasetChoice.value !== 'create-empty' ? { datasetChoice: datasetChoice.value } : {}),
		...(datasetChoice.value === 'link-existing' && selectedDataTableId.value
			? { existingDataTableId: selectedDataTableId.value }
			: {}),
	});

	if (success) {
		store.resolveConfirmation(props.requestId, 'approved');
	} else {
		isSubmitted.value = false;
	}
}

async function handleSkip() {
	if (store.resolvedConfirmationIds.has(props.requestId)) return;

	trackInput(false);
	isSubmitted.value = true;
	isDeferred.value = true;

	const success = await store.confirmAction(props.requestId, {
		kind: 'evalsPropose',
		approved: false,
	});

	if (success) {
		store.resolveConfirmation(props.requestId, 'deferred');
	} else {
		isSubmitted.value = false;
		isDeferred.value = false;
	}
}
</script>

<template>
	<div>
		<template v-if="!isSubmitted">
			<div :class="$style.card" data-test-id="instance-ai-evals-propose-card">
				<!-- Header -->
				<header :class="$style.header">
					<N8nIcon icon="flask-conical" size="small" />
					<N8nText :class="$style.title" size="medium" color="text-dark" bold>
						{{ props.message || i18n.baseText('instanceAi.evalsPropose.submit' as BaseTextKey) }}
					</N8nText>
				</header>

				<!-- Detected AI nodes -->
				<div v-if="payload.detectedAiNodes.length" :class="$style.section">
					<N8nText size="small" color="text-light" bold>
						{{ i18n.baseText('instanceAi.evalsPropose.detectedAiNodes' as BaseTextKey) }}
					</N8nText>
					<div :class="$style.badges">
						<span v-for="nodeName in payload.detectedAiNodes" :key="nodeName" :class="$style.badge">
							{{ nodeName }}
						</span>
					</div>
				</div>

				<!-- Metrics -->
				<div v-if="payload.suggestedMetrics.length" :class="$style.section">
					<N8nText size="small" color="text-light" bold>
						{{ i18n.baseText('instanceAi.evalsPropose.metricsLabel' as BaseTextKey) }}
					</N8nText>
					<div :class="$style.metricsList">
						<div
							v-for="metric in payload.suggestedMetrics"
							:key="metric.id"
							:class="$style.metricRow"
						>
							<N8nCheckbox
								:model-value="enabledMetricIds.has(metric.id)"
								:class="$style.metricCheckbox"
								@update:model-value="(checked) => toggleMetric(metric.id, Boolean(checked))"
							/>
							<div :class="$style.metricBody">
								<N8nText size="small" color="text-dark" bold>
									{{ metric.name }}
								</N8nText>
								<N8nText size="small" color="text-light">
									{{ metric.description }}
								</N8nText>
							</div>
						</div>
					</div>
				</div>

				<!-- Dataset choice -->
				<div :class="$style.section">
					<N8nText size="small" color="text-light" bold>
						{{ i18n.baseText('instanceAi.evalsPropose.dataset.label' as BaseTextKey) }}
					</N8nText>
					<N8nRadioButtons
						v-model="datasetChoice"
						:options="datasetOptions"
						size="small"
						data-test-id="instance-ai-evals-propose-dataset-choice"
					/>
					<div v-if="datasetChoice === 'link-existing'" :class="$style.dataTablePicker">
						<N8nText v-if="isLoadingDataTables" size="small" color="text-light">
							{{ i18n.baseText('instanceAi.evalsPropose.dataset.loading' as BaseTextKey) }}
						</N8nText>
						<N8nText v-else-if="dataTablesError" size="small" color="danger">
							{{ dataTablesError }}
						</N8nText>
						<N8nText v-else-if="dataTables.length === 0" size="small" color="text-light">
							{{ i18n.baseText('instanceAi.evalsPropose.dataset.empty' as BaseTextKey) }}
						</N8nText>
						<N8nSelect
							v-else
							v-model="selectedDataTableId"
							size="small"
							:placeholder="
								i18n.baseText('instanceAi.evalsPropose.dataset.pickerPlaceholder' as BaseTextKey)
							"
							data-test-id="instance-ai-evals-propose-data-table-picker"
						>
							<N8nOption
								v-for="table in dataTables"
								:key="table.id"
								:value="table.id"
								:label="table.name"
							/>
						</N8nSelect>
					</div>
				</div>

				<!-- Footer -->
				<ConfirmationFooter layout="row-between">
					<div :class="$style.footerActions">
						<N8nButton
							variant="outline"
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.evalsPropose.skip' as BaseTextKey)"
							data-test-id="instance-ai-evals-propose-skip"
							@click="handleSkip"
						/>
						<N8nButton
							size="medium"
							:class="$style.actionButton"
							:disabled="submitDisabled"
							:label="i18n.baseText('instanceAi.evalsPropose.submit' as BaseTextKey)"
							data-test-id="instance-ai-evals-propose-submit"
							@click="handleSubmit"
						/>
					</div>
				</ConfirmationFooter>
			</div>
		</template>

		<div v-else :class="$style.submitted">
			<template v-if="isDeferred">
				<N8nIcon icon="arrow-right" size="small" :class="$style.skippedIcon" />
				<span>{{ i18n.baseText('instanceAi.evalsPropose.deferred' as BaseTextKey) }}</span>
			</template>
			<template v-else>
				<N8nIcon icon="check" size="small" :class="$style.successIcon" />
				<span>{{ i18n.baseText('instanceAi.evalsPropose.submitted' as BaseTextKey) }}</span>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.title {
	flex: 1;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--sm);
	background-color: var(--color--foreground);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
}

.metricsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.metricRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.metricCheckbox {
	margin-top: var(--spacing--5xs);
}

.metricBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
}

.dataTablePicker {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--3xs);
}

.footerActions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	flex: 1;
}

.actionButton {
	--button--font-size: var(--font-size--2xs);
}

.submitted {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.successIcon {
	color: var(--color--success);
}

.skippedIcon {
	color: var(--color--text--tint-2);
}
</style>
