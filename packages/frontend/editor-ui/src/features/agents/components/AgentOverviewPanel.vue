<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { N8nInput, N8nSelect, N8nText, N8nInputNumber } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { ElSwitch } from 'element-plus';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgentCredentials } from '../composables/useAgentApi';
import { useModelCatalog } from '../composables/useModelCatalog';
import type { ModelInfo } from '../composables/useAgentApi';
import type { AgentSchema, ThinkingSchema } from '../types';

const props = defineProps<{ schema: AgentSchema | null }>();
const emit = defineEmits<{ 'update:schema': [changes: Partial<AgentSchema>] }>();

const route = useRoute();
const rootStore = useRootStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);

// Provider capabilities — defines which thinking options are available per provider
interface ProviderCapabilities {
	thinking: false | 'budgetTokens' | 'reasoningEffort';
}

const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
	anthropic: { thinking: 'budgetTokens' },
	openai: { thinking: 'reasoningEffort' },
	google: { thinking: false },
	xai: { thinking: false },
	groq: { thinking: false },
	deepseek: { thinking: false },
	mistral: { thinking: false },
	openrouter: { thinking: false },
	cohere: { thinking: false },
	ollama: { thinking: false },
};

const PROVIDERS = [
	'anthropic',
	'openai',
	'google',
	'xai',
	'groq',
	'deepseek',
	'mistral',
	'openrouter',
	'cohere',
	'ollama',
] as const;

const REASONING_EFFORT_OPTIONS = ['low', 'medium', 'high'] as const;

// Local state — kept in sync with props.schema
const description = ref(props.schema?.description ?? '');
const provider = ref(props.schema?.model.provider ?? '');
const modelName = ref(props.schema?.model.name ?? '');
const credential = ref(props.schema?.credential ?? '');
const thinkingEnabled = ref(props.schema?.config.thinking !== null);
const budgetTokens = ref(props.schema?.config.thinking?.budgetTokens ?? 1024);
const reasoningEffort = ref(props.schema?.config.thinking?.reasoningEffort ?? 'medium');
const toolCallConcurrency = ref(props.schema?.config.toolCallConcurrency ?? 1);
const requireToolApproval = ref(props.schema?.config.requireToolApproval ?? false);

const credentials = ref<Array<{ id: string; name: string; type: string }>>([]);
const credentialsLoading = ref(false);
const { ensureLoaded: ensureCatalogLoaded, getModelsForProvider } = useModelCatalog();
const availableModels = computed<ModelInfo[]>(() => getModelsForProvider(currentProvider.value));

const currentProvider = computed(() => provider.value || '');
const capabilities = computed(
	() => PROVIDER_CAPABILITIES[currentProvider.value] ?? { thinking: false },
);
const isModelRaw = computed(() => !!props.schema?.model.raw);

// Sync local state when schema prop changes externally
watch(
	() => props.schema,
	(schema) => {
		if (!schema) return;
		description.value = schema.description ?? '';
		provider.value = schema.model.provider ?? '';
		modelName.value = schema.model.name ?? '';
		credential.value = schema.credential ?? '';
		thinkingEnabled.value = schema.config.thinking !== null;
		budgetTokens.value = schema.config.thinking?.budgetTokens ?? 1024;
		reasoningEffort.value = schema.config.thinking?.reasoningEffort ?? 'medium';
		toolCallConcurrency.value = schema.config.toolCallConcurrency ?? 1;
		requireToolApproval.value = schema.config.requireToolApproval ?? false;
	},
	{ deep: true, immediate: true },
);

// Debounced emitters for text fields
const emitDescription = useDebounceFn((value: string) => {
	emit('update:schema', { description: value });
}, 1000);

const emitModel = useDebounceFn((value: string) => {
	emit('update:schema', {
		model: { provider: provider.value || '', name: value },
	});
}, 1000);

// Immediate emitters for dropdowns / toggles
function onProviderChange(value: string) {
	provider.value = value;
	emit('update:schema', {
		model: { provider: value, name: modelName.value || '' },
	});
}

function onModelSelect(value: string) {
	modelName.value = value;
	emit('update:schema', {
		model: { provider: provider.value || '', name: value },
	});
}

function onCredentialChange(value: string) {
	credential.value = value;
	emit('update:schema', { credential: value });
}

function onThinkingToggle(value: boolean) {
	thinkingEnabled.value = value;
	if (!value) {
		emit('update:schema', { config: { ...props.schema?.config, thinking: null } });
		return;
	}
	emitThinkingConfig();
}

function emitThinkingConfig() {
	const cap = capabilities.value.thinking;
	if (!cap) return;
	const thinking: ThinkingSchema = {
		provider: currentProvider.value === 'anthropic' ? 'anthropic' : 'openai',
	};
	if (cap === 'budgetTokens') {
		thinking.budgetTokens = budgetTokens.value;
	} else {
		thinking.reasoningEffort = reasoningEffort.value;
	}
	emit('update:schema', { config: { ...props.schema?.config, thinking } });
}

function onBudgetTokensChange(value: number) {
	budgetTokens.value = value;
	emitThinkingConfig();
}

function onReasoningEffortChange(value: string) {
	reasoningEffort.value = value;
	emitThinkingConfig();
}

function onToolCallConcurrencyChange(value: number) {
	toolCallConcurrency.value = value;
	emit('update:schema', { config: { ...props.schema?.config, toolCallConcurrency: value } });
}

function onRequireToolApprovalChange(value: boolean) {
	requireToolApproval.value = value;
	emit('update:schema', { config: { ...props.schema?.config, requireToolApproval: value } });
}

async function loadCredentials() {
	if (!projectId.value || !agentId.value) return;
	credentialsLoading.value = true;
	try {
		credentials.value = await listAgentCredentials(
			rootStore.restApiContext,
			projectId.value,
			agentId.value,
		);
	} catch {
		credentials.value = [];
	} finally {
		credentialsLoading.value = false;
	}
}

onMounted(() => {
	void loadCredentials();
	if (projectId.value) {
		void ensureCatalogLoaded(projectId.value);
	}
});
</script>

<template>
	<div :class="$style.panel">
		<N8nText tag="h3" bold>Overview</N8nText>
		<N8nText size="small" color="text-light">Agent configuration derived from code</N8nText>

		<!-- Description -->
		<div :class="$style.field">
			<label :class="$style.label">
				<N8nText size="small" bold>Description</N8nText>
			</label>
			<N8nInput
				v-model="description"
				type="textarea"
				:rows="3"
				placeholder="Describe what this agent does..."
				data-testid="agent-description-input"
				@update:model-value="emitDescription"
			/>
		</div>

		<!-- Provider + Model row -->
		<div :class="$style.row">
			<div :class="$style.field">
				<label :class="$style.label">
					<N8nText size="small" bold>Provider</N8nText>
				</label>
				<N8nSelect
					v-model="provider"
					placeholder="Select provider..."
					size="medium"
					data-testid="agent-provider-select"
					@update:model-value="onProviderChange"
				>
					<N8nOption v-for="p in PROVIDERS" :key="p" :value="p" :label="p" />
				</N8nSelect>
			</div>

			<div :class="$style.field">
				<label :class="$style.label">
					<N8nText size="small" bold>Model</N8nText>
				</label>
				<N8nText v-if="isModelRaw" size="small" color="text-light">
					Model configured via object — edit in code
				</N8nText>
				<N8nSelect
					v-else-if="availableModels.length > 0"
					v-model="modelName"
					filterable
					placeholder="Select model..."
					size="medium"
					data-testid="agent-model-select"
					@update:model-value="onModelSelect"
				>
					<N8nOption v-for="m in availableModels" :key="m.id" :value="m.id" :label="m.name" />
				</N8nSelect>
				<N8nInput
					v-else
					v-model="modelName"
					placeholder="e.g. claude-3-7-sonnet-latest"
					data-testid="agent-model-input"
					@update:model-value="emitModel"
				/>
			</div>
		</div>

		<!-- Credential -->
		<div :class="$style.field">
			<label :class="$style.label">
				<N8nText size="small" bold>Credential</N8nText>
			</label>
			<N8nSelect
				v-model="credential"
				placeholder="Select credential..."
				:loading="credentialsLoading"
				size="medium"
				data-testid="agent-credential-select"
				@update:model-value="onCredentialChange"
			>
				<N8nOption v-for="cred in credentials" :key="cred.id" :value="cred.id" :label="cred.name" />
			</N8nSelect>
		</div>

		<!-- Divider -->
		<div :class="$style.divider" />

		<!-- Advanced section -->
		<N8nText size="small" bold :class="$style.sectionTitle">Advanced</N8nText>

		<!-- Thinking (provider-dependent) -->
		<div v-if="capabilities.thinking" :class="$style.toggleRow">
			<N8nText size="small" bold>Thinking</N8nText>
			<ElSwitch
				:model-value="thinkingEnabled"
				data-testid="agent-thinking-toggle"
				@update:model-value="onThinkingToggle"
			/>
		</div>

		<!-- Budget tokens (Anthropic) — shown when thinking enabled -->
		<div
			v-if="capabilities.thinking === 'budgetTokens' && thinkingEnabled"
			:class="$style.toggleRow"
		>
			<N8nText size="small" bold>Budget tokens</N8nText>
			<input
				type="number"
				:value="budgetTokens"
				:class="$style.inlineNumberInput"
				data-testid="agent-budget-tokens-input"
				@change="onBudgetTokensChange(Number(($event.target as HTMLInputElement).value))"
			/>
		</div>

		<!-- Reasoning effort (OpenAI) — shown when thinking enabled -->
		<div
			v-if="capabilities.thinking === 'reasoningEffort' && thinkingEnabled"
			:class="$style.toggleRow"
		>
			<N8nText size="small" bold>Reasoning effort</N8nText>
			<N8nSelect
				:model-value="reasoningEffort"
				size="small"
				:class="$style.inlineSelect"
				data-testid="agent-reasoning-effort-select"
				@update:model-value="onReasoningEffortChange"
			>
				<N8nOption
					v-for="effort in REASONING_EFFORT_OPTIONS"
					:key="effort"
					:value="effort"
					:label="effort"
				/>
			</N8nSelect>
		</div>

		<!-- Tool call concurrency -->
		<div :class="$style.toggleRow">
			<N8nText size="small" bold>Tool call concurrency</N8nText>
			<input
				type="number"
				:value="toolCallConcurrency"
				min="1"
				:class="$style.inlineNumberInput"
				data-testid="agent-tool-concurrency-input"
				@change="onToolCallConcurrencyChange(Number(($event.target as HTMLInputElement).value))"
			/>
		</div>

		<!-- Require tool approval -->
		<div :class="$style.toggleRow">
			<N8nText size="small" bold>Require tool approval</N8nText>
			<ElSwitch
				:model-value="requireToolApproval"
				data-testid="agent-require-approval-toggle"
				@update:model-value="onRequireToolApprovalChange"
			/>
		</div>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	display: block;
}

.row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.divider {
	height: 1px;
	background-color: var(--color--foreground);
	margin: var(--spacing--2xs) 0;
}

.sectionTitle {
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.inlineNumberInput {
	width: 70px;
	text-align: center;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text);
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	outline: none;
}

.inlineNumberInput:focus {
	border-color: var(--color--primary);
}

.inlineSelect {
	width: 110px;
}
</style>
