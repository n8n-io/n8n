<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { nanoid } from 'nanoid';
import { deepCopy } from 'n8n-workflow';
import type { EvaluationMetric } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nTabs,
} from '@n8n/design-system';
import ExpressionMetricForm from './ExpressionMetricForm.vue';
import LlmJudgeMetricForm from './LlmJudgeMetricForm.vue';
import { CORRECTNESS_PROMPT } from './llmJudgePresets';

type Mode = 'add' | 'edit';
type MetricType = 'llm_judge' | 'expression';

const props = defineProps<{
	mode: Mode;
	metric: EvaluationMetric | null;
	endNodeName: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	save: [metric: EvaluationMetric];
}>();

const locale = useI18n();

function makeDraft(type: MetricType): EvaluationMetric {
	if (type === 'expression') {
		return {
			id: nanoid(),
			name: '',
			type: 'expression',
			config: { expression: '', outputType: 'numeric' },
		};
	}
	return {
		id: nanoid(),
		name: '',
		type: 'llm_judge',
		config: {
			preset: 'correctness',
			prompt: CORRECTNESS_PROMPT,
			provider: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			credentialId: '',
			model: 'gpt-4o',
			outputType: 'numeric',
			inputs: { actualAnswer: '', expectedAnswer: '' },
		},
	};
}

const draft = ref<EvaluationMetric>(props.metric ? deepCopy(props.metric) : makeDraft('llm_judge'));
const selectedTab = ref<MetricType>(draft.value.type);

watch(
	() => props.metric,
	(m) => {
		if (m) {
			draft.value = deepCopy(m);
			selectedTab.value = m.type;
		}
	},
);

watch(selectedTab, (next) => {
	if (next !== draft.value.type) {
		draft.value = makeDraft(next);
	}
});

const tabs = computed(() => [
	{ value: 'llm_judge' as const, label: locale.baseText('evaluations.config.tabs.llmJudge') },
	{ value: 'expression' as const, label: locale.baseText('evaluations.config.tabs.expression') },
]);

function onFormUpdate(updated: EvaluationMetric) {
	draft.value = updated;
}

function cancel() {
	emit('update:open', false);
}

function save() {
	if (!canSave.value) return;
	emit('save', draft.value);
	emit('update:open', false);
}

const canSave = computed(() => {
	const m = draft.value;
	if (!m.name.trim()) return false;
	if (m.type === 'expression') {
		return m.config.expression.trim().length > 0;
	}
	const { credentialId, model, inputs, preset } = m.config;
	if (!credentialId || !model || !inputs.actualAnswer) return false;
	if (preset === 'correctness' && !inputs.expectedAnswer) return false;
	if (preset === 'helpfulness' && !inputs.userQuery) return false;
	return true;
});

const title = computed(() =>
	props.mode === 'add'
		? locale.baseText('evaluations.config.modal.addTitle')
		: locale.baseText('evaluations.config.modal.editTitle'),
);

const submitLabel = computed(() =>
	props.mode === 'add'
		? locale.baseText('evaluations.config.modal.add')
		: locale.baseText('evaluations.config.modal.save'),
);
</script>

<template>
	<N8nDialog :open="true" size="medium" @update:open="emit('update:open', $event)">
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div :class="$style.tabs">
			<N8nTabs v-model="selectedTab" :options="tabs" />
		</div>

		<div :class="$style.body">
			<ExpressionMetricForm
				v-if="draft.type === 'expression'"
				:metric="draft"
				:end-node-name="endNodeName"
				@update:metric="onFormUpdate"
			/>
			<LlmJudgeMetricForm
				v-else-if="draft.type === 'llm_judge'"
				:metric="draft"
				:end-node-name="endNodeName"
				@update:metric="onFormUpdate"
			/>
		</div>

		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				:label="locale.baseText('evaluations.config.modal.cancel')"
				@click="cancel"
			/>
			<N8nButton :disabled="!canSave" :label="submitLabel" @click="save" />
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.tabs {
	border-bottom: var(--border);
	margin: var(--spacing--xs) calc(var(--spacing--md) * -1) 0;
	padding: 0 var(--spacing--md);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
	max-height: 70vh;
	overflow-y: auto;
}
</style>
