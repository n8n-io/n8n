<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import type {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatModelDto,
	EvaluationMetric,
	LlmJudgeMetricPreset,
	MetricOutputType,
} from '@n8n/api-types';
import { emptyChatModelsResponse, PROVIDER_LANGCHAIN_NODE_TYPE_MAP } from '@n8n/api-types';
import { N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import MetricExpressionEditor from './MetricExpressionEditor.vue';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import { CORRECTNESS_PROMPT, HELPFULNESS_PROMPT } from './llmJudgePresets';

type LlmJudgeMetric = Extract<EvaluationMetric, { type: 'llm_judge' }>;

const props = defineProps<{
	metric: LlmJudgeMetric;
	endNodeName: string;
}>();

const emit = defineEmits<{
	'update:metric': [metric: LlmJudgeMetric];
}>();

const locale = useI18n();
const chatStore = useChatStore();

const PROVIDER_BY_NODE_TYPE: Record<string, ChatHubLLMProvider> = Object.fromEntries(
	(Object.entries(PROVIDER_LANGCHAIN_NODE_TYPE_MAP) as Array<[ChatHubLLMProvider, string]>).map(
		([k, v]) => [v, k],
	),
);

const PRESET_PROMPTS: Record<LlmJudgeMetricPreset, string> = {
	correctness: CORRECTNESS_PROMPT,
	helpfulness: HELPFULNESS_PROMPT,
};

function update(partial: Partial<LlmJudgeMetric>) {
	emit('update:metric', { ...props.metric, ...partial });
}

function updateConfig(partial: Partial<LlmJudgeMetric['config']>) {
	emit('update:metric', {
		...props.metric,
		config: { ...props.metric.config, ...partial },
	});
}

function updateInputs(partial: Partial<LlmJudgeMetric['config']['inputs']>) {
	updateConfig({ inputs: { ...props.metric.config.inputs, ...partial } });
}

const name = computed({
	get: () => props.metric.name,
	set: (value: string) => update({ name: value }),
});

const preset = computed({
	get: () => props.metric.config.preset,
	set: (value: LlmJudgeMetricPreset) =>
		updateConfig({ preset: value, prompt: PRESET_PROMPTS[value] }),
});

const outputType = computed({
	get: () => props.metric.config.outputType,
	set: (value: MetricOutputType) => updateConfig({ outputType: value }),
});

// ModelSelector plumbing.
// Seed `credentialsMap` synchronously from the metric so the immediate watcher
// fires with the right credentials — otherwise an in-flight `fetchAgents({})`
// would dedupe against the credentialed call and leave the model dropdown empty
// when re-opening an existing metric.
const initialProvider = PROVIDER_BY_NODE_TYPE[props.metric.config.provider];
const credentialsMap = ref<CredentialsMap>(
	initialProvider && props.metric.config.credentialId
		? { [initialProvider]: props.metric.config.credentialId }
		: {},
);
const isLoadingAgents = ref(false);

const selectedAgent = computed<ChatModelDto | null>(() => {
	const provider = PROVIDER_BY_NODE_TYPE[props.metric.config.provider];
	if (!provider || !props.metric.config.model) return null;
	// Fallback name surfaces the model id while agents fetch / when the model is
	// no longer in the registry (renamed, removed, credential lost).
	return chatStore.getAgent(
		{ provider, model: props.metric.config.model },
		{ name: props.metric.config.model },
	);
});

watch(
	credentialsMap,
	async (creds) => {
		isLoadingAgents.value = true;
		try {
			await chatStore.fetchAgents(creds);
		} finally {
			isLoadingAgents.value = false;
		}
	},
	{ deep: true, immediate: true },
);

function onModelChange(model: ChatHubConversationModel) {
	if (!isLlmProviderModel(model)) return;
	const nodeType = PROVIDER_LANGCHAIN_NODE_TYPE_MAP[model.provider];
	if (!nodeType) return;
	updateConfig({
		provider: nodeType,
		model: model.model,
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	if (!(provider in PROVIDER_LANGCHAIN_NODE_TYPE_MAP)) return;
	credentialsMap.value = { ...credentialsMap.value, [provider]: credentialId };
	const currentProvider = PROVIDER_BY_NODE_TYPE[props.metric.config.provider];
	if (currentProvider === provider) {
		updateConfig({ credentialId: credentialId ?? '' });
	}
}

const actualAnswerPath = computed(
	() => `evaluations.metric.${props.metric.id}.inputs.actualAnswer`,
);
const userQueryPath = computed(() => `evaluations.metric.${props.metric.id}.inputs.userQuery`);
const expectedAnswerPath = computed(
	() => `evaluations.metric.${props.metric.id}.inputs.expectedAnswer`,
);
</script>

<template>
	<div :class="$style.metric">
		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.preset')" :bold="false">
				<N8nSelect v-model="preset" size="medium">
					<N8nOption
						:label="locale.baseText('evaluations.config.presetCorrectness')"
						value="correctness"
					/>
					<N8nOption
						:label="locale.baseText('evaluations.config.presetHelpfulness')"
						value="helpfulness"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.metricName')" :bold="false">
				<N8nInput v-model="name" size="medium" />
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.model')" :bold="false">
				<div :class="$style.modelSelector">
					<ModelSelector
						:selected-agent="selectedAgent"
						:include-custom-agents="false"
						:credentials="credentialsMap"
						:agents="chatStore.agents ?? emptyChatModelsResponse"
						:is-loading="isLoadingAgents"
						warn-missing-credentials
						@change="onModelChange"
						@select-credential="onSelectCredential"
					/>
				</div>
			</N8nInputLabel>
		</div>

		<div v-if="preset === 'helpfulness'" :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.userQuery')" :bold="false">
				<MetricExpressionEditor
					:key="`${metric.id}::userQuery::${endNodeName}`"
					:model-value="metric.config.inputs.userQuery ?? ''"
					mode="expression"
					:path="userQueryPath"
					:rows="2"
					:end-node-name="endNodeName"
					@update:model-value="updateInputs({ userQuery: $event })"
				/>
			</N8nInputLabel>
		</div>

		<div v-if="preset === 'correctness'" :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.expectedAnswer')" :bold="false">
				<MetricExpressionEditor
					:key="`${metric.id}::expectedAnswer::${endNodeName}`"
					:model-value="metric.config.inputs.expectedAnswer ?? ''"
					mode="expression"
					:path="expectedAnswerPath"
					:rows="2"
					:end-node-name="endNodeName"
					@update:model-value="updateInputs({ expectedAnswer: $event })"
				/>
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.actualAnswer')" :bold="false">
				<MetricExpressionEditor
					:key="`${metric.id}::actualAnswer::${endNodeName}`"
					:model-value="metric.config.inputs.actualAnswer"
					mode="expression"
					:path="actualAnswerPath"
					:rows="2"
					:end-node-name="endNodeName"
					@update:model-value="updateInputs({ actualAnswer: $event })"
				/>
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.outputType')" :bold="false">
				<N8nSelect v-model="outputType" size="medium">
					<N8nOption
						:label="locale.baseText('evaluations.config.outputTypeNumeric')"
						value="numeric"
					/>
					<N8nOption
						:label="locale.baseText('evaluations.config.outputTypeBoolean')"
						value="boolean"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</div>
	</div>
</template>

<style module lang="scss">
.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.modelSelector {
	display: block;
	width: 100%;
}

.modelSelector :global([data-test-id='chat-model-selector']) {
	width: 100% !important;
	justify-content: space-between;
}

/* The chat-hub ModelSelector stacks the model name and credential name
 * vertically inside an internal `.selected` div. We want them side-by-side here.
 * Vite's CSS-module hashing keeps the original local name as a substring
 * (e.g. `_selected_abc12`), so an attribute-substring selector reaches it without
 * modifying the chat-hub component. If chat-hub renames the class this rule
 * silently no-ops — a horizontal-layout prop on ModelSelector would be the
 * less brittle long-term fix. */
.modelSelector :global([data-test-id='chat-model-selector'] [class*='selected']) {
	flex-direction: row !important;
	align-items: center !important;
	gap: var(--spacing--3xs);
}
</style>
