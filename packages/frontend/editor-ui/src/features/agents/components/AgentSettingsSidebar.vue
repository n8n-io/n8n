<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCallout, N8nInput, N8nSelect, N8nText } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgentCredentials } from '../composables/useAgentApi';
import { useModelCatalog } from '../composables/useModelCatalog';
import type { ModelInfo } from '../composables/useAgentApi';
import type { AgentSchema } from '../types';
import AgentToolsPanel from './AgentToolsPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentCodeEditor from './AgentCodeEditor.vue';

const locale = useI18n();
const route = useRoute();
const rootStore = useRootStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);

const props = defineProps<{
	schema: AgentSchema | null;
	code: string;
	updatedAt: string;
}>();

const emit = defineEmits<{
	'update:schema': [changes: Partial<AgentSchema>];
	'update:code': [code: string];
	save: [];
	cancel: [];
}>();

// --- Model & credential state ---
const { ensureLoaded: ensureCatalogLoaded, getModelsForProvider } = useModelCatalog();
const credentials = ref<Array<{ id: string; name: string; type: string }>>([]);
const credentialsLoading = ref(false);

const provider = ref(props.schema?.model.provider ?? '');
const modelName = ref(props.schema?.model.name ?? '');
const credential = ref(props.schema?.credential ?? '');
const instructions = ref(props.schema?.instructions ?? '');

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

const availableModels = computed<ModelInfo[]>(() => getModelsForProvider(provider.value || ''));

// Sync local state when schema prop changes externally
watch(
	() => props.schema,
	(schema) => {
		if (!schema) return;
		provider.value = schema.model.provider ?? '';
		modelName.value = schema.model.name ?? '';
		credential.value = schema.credential ?? '';
		instructions.value = schema.instructions ?? '';
	},
	{ deep: true, immediate: true },
);

function onModelSelect(value: string) {
	modelName.value = value;
	emitSchemaUpdate({
		model: { provider: provider.value || '', name: value },
	});
}

function onProviderChange(value: string) {
	provider.value = value;
	emitSchemaUpdate({
		model: { provider: value, name: modelName.value || '' },
	});
}

function onCredentialChange(value: string) {
	credential.value = value;
	emitSchemaUpdate({ credential: value });
}

function onInstructionsChange(value: string) {
	instructions.value = value;
	emitSchemaUpdate({ instructions: value });
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

// --- Dirty state tracking ---
const originalSchemaJson = ref('');
const isDirty = ref(false);

watch(
	() => props.schema,
	(s) => {
		if (s) {
			originalSchemaJson.value = JSON.stringify(s);
			isDirty.value = false;
		}
	},
	{ immediate: true },
);

function emitSchemaUpdate(changes: Partial<AgentSchema>) {
	emit('update:schema', changes);
	setTimeout(() => {
		if (props.schema) {
			isDirty.value = JSON.stringify(props.schema) !== originalSchemaJson.value;
		}
	}, 0);
}

function onSave() {
	emit('save');
	if (props.schema) {
		originalSchemaJson.value = JSON.stringify(props.schema);
	}
	isDirty.value = false;
}

function onCancel() {
	emit('cancel');
	isDirty.value = false;
}

// --- Collapsible sections ---
const expandedSections = ref<Record<string, boolean>>({
	triggers: false,
	tools: false,
	advanced: false,
	code: false,
});

function toggleSection(section: string) {
	expandedSections.value[section] = !expandedSections.value[section];
}

onMounted(() => {
	void loadCredentials();
	if (projectId.value) {
		void ensureCatalogLoaded(projectId.value);
	}
});
</script>

<template>
	<aside :class="$style.sidebar">
		<div :class="$style.header">
			<N8nText tag="span" bold size="large">{{ locale.baseText('agents.settings.title') }}</N8nText>
			<div :class="$style.headerActions">
				<N8nButton
					type="secondary"
					size="small"
					:label="locale.baseText('agents.settings.cancel')"
					:disabled="!isDirty"
					@click="onCancel"
				/>
				<N8nButton
					type="primary"
					size="small"
					:label="locale.baseText('agents.settings.save')"
					:disabled="!isDirty"
					@click="onSave"
				/>
			</div>
		</div>

		<N8nCallout v-if="isDirty" theme="warning" :class="$style.unsavedBanner">
			{{ locale.baseText('agents.settings.unsavedChanges') }}
		</N8nCallout>

		<div :class="$style.body">
			<!-- Model section (always visible) -->
			<div :class="$style.staticSection">
				<N8nText tag="span" bold size="small">{{
					locale.baseText('agents.settings.model')
				}}</N8nText>

				<!-- Combined model selector -->
				<N8nSelect
					:model-value="modelName"
					filterable
					:placeholder="locale.baseText('agents.settings.model.selectModel')"
					size="medium"
					data-testid="agent-model-select"
					@update:model-value="onModelSelect"
				>
					<N8nOption v-for="m in availableModels" :key="m.id" :value="m.id" :label="m.name" />
				</N8nSelect>

				<!-- Provider (smaller, secondary) -->
				<div :class="$style.providerRow">
					<N8nSelect
						:model-value="provider"
						:placeholder="locale.baseText('agents.settings.model.selectProvider')"
						size="small"
						data-testid="agent-provider-select"
						@update:model-value="onProviderChange"
					>
						<N8nOption v-for="p in PROVIDERS" :key="p" :value="p" :label="p" />
					</N8nSelect>

					<N8nSelect
						:model-value="credential"
						:placeholder="locale.baseText('agents.settings.model.selectCredential')"
						:loading="credentialsLoading"
						size="small"
						data-testid="agent-credential-select"
						@update:model-value="onCredentialChange"
					>
						<N8nOption
							v-for="cred in credentials"
							:key="cred.id"
							:value="cred.id"
							:label="cred.name"
						/>
					</N8nSelect>
				</div>
			</div>

			<!-- Instructions section (always visible) -->
			<div :class="$style.staticSection">
				<N8nText tag="span" bold size="small">{{
					locale.baseText('agents.settings.instructions')
				}}</N8nText>
				<N8nInput
					:model-value="instructions"
					type="textarea"
					:rows="5"
					:placeholder="locale.baseText('agents.settings.instructions.placeholder')"
					data-testid="agent-instructions-input"
					@update:model-value="onInstructionsChange"
				/>
			</div>

			<!-- Triggers (collapsible) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('triggers')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.triggers')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.triggers ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.triggers" :class="$style.sectionContent">
					<N8nText size="small" color="text-light">
						{{ locale.baseText('agents.settings.triggers.placeholder') }}
					</N8nText>
				</div>
			</div>

			<!-- Tools (collapsible) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('tools')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.tools')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.tools ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.tools" :class="$style.sectionContent">
					<AgentToolsPanel :schema="schema" @update:schema="emitSchemaUpdate" />
				</div>
			</div>

			<!-- Advanced (collapsible) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('advanced')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.advanced')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.advanced ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.advanced" :class="$style.sectionContent">
					<AgentMemoryPanel :schema="schema" @update:schema="emitSchemaUpdate" />
				</div>
			</div>

			<!-- Code (collapsed by default) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('code')">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.code')
					}}</N8nText>
					<span :class="$style.chevron">{{ expandedSections.code ? '−' : '+' }}</span>
				</button>
				<div v-if="expandedSections.code" :class="$style.codeSection">
					<AgentCodeEditor :model-value="code" @update:model-value="emit('update:code', $event)" />
				</div>
			</div>
		</div>
	</aside>
</template>

<style module>
.sidebar {
	width: 340px;
	min-width: 340px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--background);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	flex-shrink: 0;
}

.headerActions {
	display: flex;
	gap: var(--spacing--4xs);
}

.unsavedBanner {
	flex-shrink: 0;
}

.body {
	flex: 1;
	overflow-y: auto;
}

.staticSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.providerRow {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--2xs);
}

.section {
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
}

.sectionHeader:hover {
	background-color: var(--color--foreground--tint-2);
}

.chevron {
	font-size: var(--font-size--md);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

.sectionContent {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.codeSection {
	height: 400px;
	min-height: 300px;
}
</style>
