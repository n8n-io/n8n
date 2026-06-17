<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type {
	AddDatasetRowDto,
	DatasetCandidateResponse,
	DatasetFieldSource,
	EvaluationConfigDto,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	N8nButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';

import Modal from '@/app/components/Modal.vue';
import { ADD_EXECUTION_TO_DATASET_MODAL_KEY } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useEvaluationStore } from '../../evaluation.store';
import { stringifyValue } from '../../evaluation.utils';

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		executionId: string;
		configs: EvaluationConfigDto[];
	};
}>();

const locale = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const evaluationStore = useEvaluationStore();
const modalBus = createEventBus();

const selectedConfigId = ref<string>(props.data.configs[0]?.id ?? '');
const candidate = ref<DatasetCandidateResponse | null>(null);
const loadingCandidate = ref(false);
const submitting = ref(false);

// Per-column selection. Value is '' (leave empty) or `${source}:${field}`.
const mapping = ref<Record<string, string>>({});

const hasMultipleConfigs = computed(() => props.data.configs.length > 1);
const selectedConfigName = computed(
	() => props.data.configs.find((c) => c.id === selectedConfigId.value)?.name ?? '',
);

type FieldOption = {
	value: string;
	field: string;
	source: DatasetFieldSource;
	sourceLabel: string;
	sample: unknown;
};

const fieldOptions = computed<FieldOption[]>(() => {
	if (!candidate.value) return [];
	const inputLabel = locale.baseText('evaluations.addToDataset.source.input');
	const outputLabel = locale.baseText('evaluations.addToDataset.source.output');
	return [
		...candidate.value.fields.inputs.map((f) => ({
			value: `input:${f.key}`,
			field: f.key,
			source: 'input' as const,
			sourceLabel: inputLabel,
			sample: f.sample,
		})),
		...candidate.value.fields.outputs.map((f) => ({
			value: `output:${f.key}`,
			field: f.key,
			source: 'output' as const,
			sourceLabel: outputLabel,
			sample: f.sample,
		})),
	];
});

const sampleByValue = computed<Record<string, unknown>>(() =>
	fieldOptions.value.reduce<Record<string, unknown>>((acc, option) => {
		acc[option.value] = option.sample;
		return acc;
	}, {}),
);

const hasColumns = computed(() => (candidate.value?.columns.length ?? 0) > 0);

const mappedColumnCount = computed(
	() => Object.values(mapping.value).filter((value) => value !== '').length,
);

const canSubmit = computed(
	() =>
		!loadingCandidate.value && !submitting.value && hasColumns.value && mappedColumnCount.value > 0,
);

function formatSample(value: unknown): string {
	if (value === null || value === undefined)
		return locale.baseText('evaluations.addToDataset.empty');
	return stringifyValue(value);
}

function initMappingFromSuggestion(response: DatasetCandidateResponse): void {
	mapping.value = response.columns.reduce<Record<string, string>>((acc, column) => {
		const suggestion = response.suggestedMapping[column.name];
		acc[column.name] = suggestion ? `${suggestion.source}:${suggestion.field}` : '';
		return acc;
	}, {});
}

async function loadCandidate(configId: string): Promise<void> {
	if (!configId) return;
	loadingCandidate.value = true;
	candidate.value = null;
	try {
		const response = await evaluationStore.getDatasetCandidate({
			workflowId: props.data.workflowId,
			configId,
			executionId: props.data.executionId,
		});
		// Switching configs fires overlapping requests; ignore a response that no
		// longer matches the active selection so a stale config can't overwrite it.
		if (configId !== selectedConfigId.value) return;
		candidate.value = response;
		initMappingFromSuggestion(response);
	} catch (error) {
		if (configId !== selectedConfigId.value) return;
		toast.showError(error, locale.baseText('evaluations.addToDataset.error.candidate'));
	} finally {
		if (configId === selectedConfigId.value) loadingCandidate.value = false;
	}
}

function buildPayloadMapping(): AddDatasetRowDto['mapping'] {
	const result: AddDatasetRowDto['mapping'] = {};
	for (const column of candidate.value?.columns ?? []) {
		const selected = mapping.value[column.name];
		if (!selected) {
			result[column.name] = null;
			continue;
		}
		// Source is always `input`/`output` (no colon); field may contain colons.
		const separatorIndex = selected.indexOf(':');
		const source = selected.slice(0, separatorIndex) as DatasetFieldSource;
		const field = selected.slice(separatorIndex + 1);
		result[column.name] = { source, field };
	}
	return result;
}

async function onSubmit(): Promise<void> {
	if (!canSubmit.value) return;
	submitting.value = true;
	try {
		await evaluationStore.addExecutionToDataset({
			workflowId: props.data.workflowId,
			configId: selectedConfigId.value,
			payload: {
				executionId: props.data.executionId,
				mapping: buildPayloadMapping(),
			},
		});
		telemetry.track('User added execution to evaluation dataset', {
			workflow_id: props.data.workflowId,
			execution_id: props.data.executionId,
			config_id: selectedConfigId.value,
			columns_mapped: mappedColumnCount.value,
		});
		toast.showMessage({
			type: 'success',
			title: locale.baseText('evaluations.addToDataset.success.title'),
		});
		modalBus.emit('close');
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.addToDataset.error.submit'));
	} finally {
		submitting.value = false;
	}
}

watch(selectedConfigId, async (configId) => await loadCandidate(configId));

onMounted(async () => {
	telemetry.track('User opened add execution to dataset modal', {
		workflow_id: props.data.workflowId,
		execution_id: props.data.executionId,
		config_count: props.data.configs.length,
	});
	await loadCandidate(selectedConfigId.value);
});
</script>

<template>
	<Modal
		:name="ADD_EXECUTION_TO_DATASET_MODAL_KEY"
		:title="locale.baseText('evaluations.addToDataset.title')"
		:event-bus="modalBus"
		:center="true"
		max-width="640px"
		data-test-id="add-execution-to-dataset-modal"
	>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.field">
					<N8nInputLabel
						:label="locale.baseText('evaluations.addToDataset.config.label')"
						:bold="false"
						size="small"
					/>
					<N8nSelect
						v-if="hasMultipleConfigs"
						v-model="selectedConfigId"
						size="medium"
						data-test-id="add-execution-to-dataset-config-select"
					>
						<N8nOption
							v-for="config in props.data.configs"
							:key="config.id"
							:label="config.name"
							:value="config.id"
						/>
					</N8nSelect>
					<N8nText v-else size="medium" color="text-dark">
						{{ selectedConfigName }}
					</N8nText>
				</div>

				<div v-if="loadingCandidate" :class="$style.loading" data-test-id="add-execution-loading">
					<N8nSpinner type="ring" />
				</div>

				<div v-else-if="!hasColumns" :class="$style.empty">
					<N8nText color="text-base">
						{{ locale.baseText('evaluations.addToDataset.noColumns') }}
					</N8nText>
				</div>

				<div v-else :class="$style.mapping" data-test-id="add-execution-to-dataset-mapping">
					<N8nInputLabel
						:label="locale.baseText('evaluations.addToDataset.mapping.title')"
						size="small"
					/>
					<div
						v-for="column in candidate?.columns ?? []"
						:key="column.name"
						:class="$style.row"
						:data-test-id="`add-execution-to-dataset-column-${column.name}`"
					>
						<div :class="$style.column">
							<N8nInputLabel :label="column.name" size="small" />
							<N8nText size="xsmall" color="text-light">{{ column.type }}</N8nText>
						</div>
						<div :class="$style.source">
							<N8nSelect
								v-model="mapping[column.name]"
								size="medium"
								filterable
								:placeholder="locale.baseText('evaluations.addToDataset.field.placeholder')"
								:data-test-id="`add-execution-to-dataset-select-${column.name}`"
							>
								<N8nOption
									:label="locale.baseText('evaluations.addToDataset.leaveEmpty')"
									:value="''"
								/>
								<N8nOption
									v-for="option in fieldOptions"
									:key="option.value"
									:label="`${option.field} (${option.sourceLabel})`"
									:value="option.value"
								/>
							</N8nSelect>
							<N8nText
								v-if="mapping[column.name]"
								size="xsmall"
								color="text-light"
								:class="$style.sample"
							>
								{{ formatSample(sampleByValue[mapping[column.name]]) }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="locale.baseText('generic.cancel')"
					data-test-id="add-execution-to-dataset-cancel"
					@click="close"
				/>
				<N8nButton
					:label="locale.baseText('evaluations.addToDataset.submit')"
					:loading="submitting"
					:disabled="!canSubmit"
					data-test-id="add-execution-to-dataset-submit"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.loading,
.empty {
	display: flex;
	justify-content: center;
	padding: var(--spacing--lg) 0;
}

.mapping {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.row {
	display: grid;
	// `minmax(0, …)` lets each track shrink below its content so a long sample
	// value ellipsizes instead of widening the modal.
	grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
	gap: var(--spacing--sm);
	align-items: start;
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-top: var(--spacing--5xs);
	word-break: break-word;
}

.source {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	// Allow the column to shrink so the ellipsized sample never grows the track.
	min-width: 0;
}

.sample {
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
