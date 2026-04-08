<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { N8nCallout, N8nIcon, N8nInput, N8nSelect, N8nText } from '@n8n/design-system';
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
	isDirty: boolean;
}>();

const emit = defineEmits<{
	'update:schema': [changes: Partial<AgentSchema>];
	'update:code': [code: string];
}>();

// --- Model & credential state ---
const { ensureLoaded: ensureCatalogLoaded, getModelsForProvider } = useModelCatalog();
const credentials = ref<Array<{ id: string; name: string; type: string }>>([]);
const credentialsLoading = ref(false);

const provider = ref(props.schema?.model.provider ?? '');
const modelName = ref(props.schema?.model.name ?? '');
const credential = ref(props.schema?.credential ?? '');
const instructions = ref(props.schema?.instructions ?? '');

const availableModels = computed<ModelInfo[]>(() => getModelsForProvider(provider.value || ''));

// Combined model display: "Model Name  Credential Name"
const modelOptions = computed(() => {
	return availableModels.value.map((m) => ({
		value: m.id,
		label: m.name,
	}));
});

const credentialLabel = computed(() => {
	if (!credential.value) return '';
	const cred = credentials.value.find((c) => c.id === credential.value);
	return cred?.name ?? '';
});

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
	emit('update:schema', {
		model: { provider: provider.value || '', name: value },
	});
}

function onCredentialChange(value: string) {
	credential.value = value;
	emit('update:schema', { credential: value });
}

function onInstructionsChange(value: string) {
	instructions.value = value;
	emit('update:schema', { instructions: value });
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

// --- Resizable width ---
const sidebarWidth = ref(480);
const isResizing = ref(false);
const MIN_WIDTH = 360;
const MAX_WIDTH = 700;

function onResizeStart(event: MouseEvent) {
	isResizing.value = true;
	const startX = event.clientX;
	const startWidth = sidebarWidth.value;

	function onMouseMove(e: MouseEvent) {
		const delta = startX - e.clientX;
		sidebarWidth.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
	}

	function onMouseUp() {
		isResizing.value = false;
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

onMounted(() => {
	void loadCredentials();
	if (projectId.value) {
		void ensureCatalogLoaded(projectId.value);
	}
});
</script>

<template>
	<aside
		:class="$style.sidebar"
		:style="{ width: `${sidebarWidth}px`, minWidth: `${MIN_WIDTH}px` }"
	>
		<!-- Resize handle -->
		<div :class="$style.resizeHandle" @mousedown="onResizeStart" />

		<!-- Unsaved changes banner -->
		<N8nCallout v-if="isDirty" theme="warning" :class="$style.unsavedBanner">
			{{ locale.baseText('agents.settings.unsavedChanges') }}
		</N8nCallout>

		<div :class="$style.body">
			<!-- Model section -->
			<div :class="$style.staticSection">
				<div :class="$style.sectionLabel">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.model')
					}}</N8nText>
				</div>

				<!-- Combined model + credential selector -->
				<div :class="$style.modelSelector">
					<N8nSelect
						:model-value="modelName"
						filterable
						:placeholder="locale.baseText('agents.settings.model.selectModel')"
						size="medium"
						:class="$style.modelSelect"
						data-testid="agent-model-select"
						@update:model-value="onModelSelect"
					>
						<N8nOption v-for="m in modelOptions" :key="m.value" :value="m.value" :label="m.label" />
					</N8nSelect>
					<N8nText
						v-if="credentialLabel"
						:class="$style.credentialInline"
						size="small"
						color="text-light"
					>
						{{ credentialLabel }}
					</N8nText>
				</div>

				<!-- Credential selector (separate row) -->
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

			<!-- Instructions section -->
			<div :class="$style.staticSection">
				<div :class="$style.sectionLabel">
					<N8nText tag="span" bold size="small">{{
						locale.baseText('agents.settings.instructions')
					}}</N8nText>
				</div>
				<N8nInput
					:model-value="instructions"
					type="textarea"
					:rows="6"
					:placeholder="locale.baseText('agents.settings.instructions.placeholder')"
					data-testid="agent-instructions-input"
					@update:model-value="onInstructionsChange"
				/>
			</div>

			<!-- Triggers (collapsible) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('triggers')">
					<div :class="$style.sectionHeaderLeft">
						<N8nIcon
							:icon="expandedSections.triggers ? 'chevron-down' : 'chevron-right'"
							:size="16"
						/>
						<N8nText tag="span" bold size="small">{{
							locale.baseText('agents.settings.triggers')
						}}</N8nText>
					</div>
					<button :class="$style.addBtn" @click.stop>
						<N8nIcon icon="plus" :size="16" />
					</button>
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
					<div :class="$style.sectionHeaderLeft">
						<N8nIcon :icon="expandedSections.tools ? 'chevron-down' : 'chevron-right'" :size="16" />
						<N8nText tag="span" bold size="small">{{
							locale.baseText('agents.settings.tools')
						}}</N8nText>
					</div>
					<button :class="$style.addBtn" @click.stop>
						<N8nIcon icon="plus" :size="16" />
					</button>
				</button>
				<div v-if="expandedSections.tools" :class="$style.sectionContent">
					<AgentToolsPanel
						:schema="schema"
						@update:schema="(changes) => emit('update:schema', changes)"
					/>
				</div>
			</div>

			<!-- Advanced (collapsible) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('advanced')">
					<div :class="$style.sectionHeaderLeft">
						<N8nIcon
							:icon="expandedSections.advanced ? 'chevron-down' : 'chevron-right'"
							:size="16"
						/>
						<N8nText tag="span" bold size="small">{{
							locale.baseText('agents.settings.advanced')
						}}</N8nText>
					</div>
					<button :class="$style.addBtn" @click.stop>
						<N8nIcon icon="plus" :size="16" />
					</button>
				</button>
				<div v-if="expandedSections.advanced" :class="$style.sectionContent">
					<AgentMemoryPanel
						:schema="schema"
						@update:schema="(changes) => emit('update:schema', changes)"
					/>
				</div>
			</div>

			<!-- Code (collapsed by default) -->
			<div :class="$style.section">
				<button :class="$style.sectionHeader" @click="toggleSection('code')">
					<div :class="$style.sectionHeaderLeft">
						<N8nIcon :icon="expandedSections.code ? 'chevron-down' : 'chevron-right'" :size="16" />
						<N8nText tag="span" bold size="small">{{
							locale.baseText('agents.settings.code')
						}}</N8nText>
					</div>
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
	position: relative;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--background);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	flex-shrink: 0;
}

.resizeHandle {
	position: absolute;
	top: 0;
	left: -3px;
	width: 6px;
	height: 100%;
	cursor: col-resize;
	z-index: 5;
}

.resizeHandle:hover {
	background-color: var(--color--primary--tint-2);
}

.unsavedBanner {
	flex-shrink: 0;
	text-align: center;
	border-radius: 0;
}

.body {
	flex: 1;
	overflow-y: auto;
}

.staticSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.sectionLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.modelSelector {
	position: relative;
}

.modelSelect {
	width: 100%;
}

.credentialInline {
	margin-top: var(--spacing--4xs);
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

.sectionHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.addBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
}

.addBtn:hover {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--text);
}

.sectionContent {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.codeSection {
	height: 400px;
	min-height: 300px;
}
</style>
