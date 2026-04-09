<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCallout, N8nIcon, N8nInput, N8nSelect, N8nText } from '@n8n/design-system';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	chatHubLLMProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
} from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getResourcePermissions } from '@n8n/permissions';
import { CHAT_CREDENTIAL_SELECTOR_MODAL_KEY } from '@/features/ai/chatHub/constants';
import { listAgentCredentials } from '../composables/useAgentApi';
import { useModelCatalog } from '../composables/useModelCatalog';
import type { ModelInfo } from '../composables/useAgentApi';
import type { AgentSchema } from '../types';
import { CHATHUB_TO_CATALOG, CATALOG_TO_CHATHUB } from '../provider-mapping';
import AgentToolsPanel from './AgentToolsPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentCodeEditor from './AgentCodeEditor.vue';

const locale = useI18n();
const route = useRoute();
const rootStore = useRootStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();

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
	save: [];
	cancel: [];
}>();

// Supported providers from ChatHub (canonical list), sorted alphabetically by display name
const supportedProviders = computed(() => {
	return chatHubLLMProviderSchema.options
		.map((id) => ({
			chatHubId: id,
			catalogId: CHATHUB_TO_CATALOG[id] ?? id,
			name: providerDisplayNames[id] ?? id,
			credentialType: PROVIDER_CREDENTIAL_TYPE_MAP[id],
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
});

// --- Model & credential state ---
const { ensureLoaded: ensureCatalogLoaded, getModelsForProvider } = useModelCatalog();
const credentials = ref<Array<{ id: string; name: string; type: string }>>([]);
const credentialsLoading = ref(false);

// Internal state uses catalog IDs (what the agent SDK expects)
const provider = ref(props.schema?.model.provider ?? '');
const modelName = ref(props.schema?.model.name ?? '');
const credential = ref(props.schema?.credential ?? '');
const instructions = ref(props.schema?.instructions ?? '');

// Find the ChatHub provider ID for the current catalog provider
const currentChatHubProvider = computed<ChatHubLLMProvider | undefined>(
	() => CATALOG_TO_CHATHUB[provider.value],
);

const currentCredentialType = computed(() => {
	const chp = currentChatHubProvider.value;
	return chp ? PROVIDER_CREDENTIAL_TYPE_MAP[chp] : undefined;
});

const availableModels = computed<ModelInfo[]>(() => getModelsForProvider(provider.value || ''));

const modelDisplayName = computed(() => {
	if (!modelName.value) return locale.baseText('agents.settings.model.selectModel');
	const model = availableModels.value.find((m) => m.id === modelName.value);
	return model?.name ?? modelName.value;
});

const credentialDisplayName = computed(() => {
	if (!credential.value) return '';
	// Try agent-scoped list first, then global credentials store
	const agentCred = credentials.value.find((c) => c.id === credential.value);
	if (agentCred) return agentCred.name;
	const globalCred = credentialsStore.getCredentialById(credential.value);
	return globalCred?.name ?? '';
});

// Whether model selection is disabled (no credential set for current provider)
const isModelDisabled = computed(() => !credential.value && !!provider.value);

// Model config panel state
const modelConfigOpen = ref(false);

// --- Credential setup (same pattern as ChatHub ModelSelector) ---
const canCreateCredentials = computed(() => {
	return getResourcePermissions(projectsStore.personalProject?.scopes).credential.create;
});

function openCredentialSetup() {
	const chp = currentChatHubProvider.value;
	if (!chp) return;

	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[chp];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0 && canCreateCredentials.value) {
		// No credentials exist — open the credential creation modal
		uiStore.openNewCredential(credentialType);
		return;
	}

	// Credentials exist — open the selector modal
	uiStore.openModalWithData({
		name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
		data: {
			credentialType,
			displayName: chp ? providerDisplayNames[chp] : '',
			initialValue: credential.value || null,
			onSelect: (credentialId: string | null) => {
				if (credentialId) {
					onCredentialChange(credentialId);
				}
			},
		},
	});
}

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

function onProviderChange(catalogId: string) {
	provider.value = catalogId;
	modelName.value = '';

	// Auto-select credential if exactly one exists for this provider
	const chp = CATALOG_TO_CHATHUB[catalogId];
	if (chp) {
		const credType = PROVIDER_CREDENTIAL_TYPE_MAP[chp as ChatHubLLMProvider];
		const existing = credentialsStore.getCredentialsByType(credType);
		if (existing.length === 1) {
			credential.value = existing[0].id;
			emit('update:schema', {
				model: { provider: catalogId, name: '' },
				credential: existing[0].id,
			});
			return;
		}
	}

	credential.value = '';
	emit('update:schema', { model: { provider: catalogId, name: '' }, credential: '' });
}

function onModelSelect(value: string) {
	modelName.value = value;
	emit('update:schema', { model: { provider: provider.value || '', name: value } });
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
const MIN_WIDTH = 360;
const MAX_WIDTH = 700;

function onResizeStart(event: MouseEvent) {
	const startX = event.clientX;
	const startWidth = sidebarWidth.value;

	function onMouseMove(e: MouseEvent) {
		const delta = startX - e.clientX;
		sidebarWidth.value = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
	}

	function onMouseUp() {
		document.removeEventListener('mousemove', onMouseMove);
		document.removeEventListener('mouseup', onMouseUp);
	}

	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('mouseup', onMouseUp);
}

async function initCredentials() {
	// Ensure the global credentials store is populated (needed for getCredentialsByType + CredentialIcon)
	await credentialsStore.fetchAllCredentials({ projectId: projectId.value });

	// Also load agent-scoped credentials for the credential dropdown
	await loadCredentials();

	// Auto-select credential for the current provider if one exists and none is set
	if (provider.value && !credential.value) {
		const chp = CATALOG_TO_CHATHUB[provider.value];
		if (chp) {
			const credType = PROVIDER_CREDENTIAL_TYPE_MAP[chp as ChatHubLLMProvider];
			const existing = credentialsStore.getCredentialsByType(credType);
			if (existing.length === 1) {
				credential.value = existing[0].id;
				emit('update:schema', { credential: existing[0].id });
			}
		}
	}
}

onMounted(() => {
	void initCredentials();
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

		<!-- Sidebar header -->
		<div :class="$style.header">
			<N8nText tag="span" bold>{{ locale.baseText('agents.settings.title') }}</N8nText>
			<div :class="$style.headerActions">
				<button :class="$style.cancelBtn" :disabled="!isDirty" @click="emit('cancel')">
					{{ locale.baseText('agents.settings.cancel') }}
				</button>
				<N8nButton
					type="primary"
					size="small"
					:label="locale.baseText('agents.settings.save')"
					:disabled="!isDirty"
					@click="emit('save')"
				/>
			</div>
		</div>

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
					<button :class="$style.menuBtn">
						<N8nIcon icon="ellipsis" :size="16" />
					</button>
				</div>

				<!-- Combined model display — single clickable row -->
				<button :class="$style.modelDisplay" @click="modelConfigOpen = !modelConfigOpen">
					<div :class="$style.modelDisplayContent">
						<CredentialIcon
							v-if="currentCredentialType"
							:credential-type-name="currentCredentialType"
							:size="20"
						/>
						<N8nText tag="span" bold size="small">{{ modelDisplayName }}</N8nText>
						<N8nText v-if="credentialDisplayName" tag="span" size="small" color="text-light">
							{{ credentialDisplayName }}
						</N8nText>
					</div>
					<N8nIcon icon="chevron-down" :size="14" />
				</button>

				<!-- Model config panel (expandable) -->
				<div v-if="modelConfigOpen" :class="$style.modelConfig">
					<!-- Provider -->
					<div :class="$style.modelConfigField">
						<N8nText size="xsmall" color="text-light" bold>Provider</N8nText>
						<N8nSelect
							:model-value="provider"
							placeholder="Provider..."
							size="small"
							@update:model-value="onProviderChange"
						>
							<N8nOption
								v-for="p in supportedProviders"
								:key="p.catalogId"
								:value="p.catalogId"
								:label="p.name"
							>
								<div :class="$style.providerOption">
									<CredentialIcon :credential-type-name="p.credentialType" :size="16" />
									<span>{{ p.name }}</span>
								</div>
							</N8nOption>
						</N8nSelect>
					</div>

					<!-- Credential (setup flow) -->
					<div :class="$style.modelConfigField">
						<N8nText size="xsmall" color="text-light" bold>Credential</N8nText>
						<button
							v-if="provider && !credential"
							:class="$style.credentialSetupBtn"
							@click="openCredentialSetup"
						>
							<N8nIcon icon="plus" :size="12" />
							<span>{{ locale.baseText('agents.settings.model.setupCredential') }}</span>
						</button>
						<button
							v-else-if="credential"
							:class="$style.credentialDisplayBtn"
							@click="openCredentialSetup"
						>
							<CredentialIcon
								v-if="currentCredentialType"
								:credential-type-name="currentCredentialType"
								:size="16"
							/>
							<span>{{ credentialDisplayName }}</span>
							<N8nIcon icon="pencil" :size="12" />
						</button>
					</div>

					<!-- Model (disabled until credential is set) -->
					<div :class="$style.modelConfigField">
						<N8nText size="xsmall" color="text-light" bold>Model</N8nText>
						<N8nSelect
							:model-value="modelName"
							filterable
							placeholder="Model..."
							size="small"
							:disabled="isModelDisabled"
							@update:model-value="onModelSelect"
						>
							<N8nOption v-for="m in availableModels" :key="m.id" :value="m.id" :label="m.name">
								<div :class="$style.providerOption">
									<CredentialIcon
										v-if="currentCredentialType"
										:credential-type-name="currentCredentialType"
										:size="16"
									/>
									<span>{{ m.name }}</span>
								</div>
							</N8nOption>
						</N8nSelect>
						<N8nText v-if="isModelDisabled" size="xsmall" color="text-light">
							{{ locale.baseText('agents.settings.model.credentialRequired') }}
						</N8nText>
					</div>
				</div>
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
					<span role="button" tabindex="0" :class="$style.addBtn" @click.stop @keydown.enter.stop>
						<N8nIcon icon="plus" :size="16" />
					</span>
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
					<span role="button" tabindex="0" :class="$style.addBtn" @click.stop @keydown.enter.stop>
						<N8nIcon icon="plus" :size="16" />
					</span>
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
					<span role="button" tabindex="0" :class="$style.addBtn" @click.stop @keydown.enter.stop>
						<N8nIcon icon="plus" :size="16" />
					</span>
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 56px;
	min-height: 56px;
	padding: 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--background);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.cancelBtn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
}

.cancelBtn:hover {
	background-color: var(--color--foreground--tint-2);
}

.cancelBtn:disabled {
	color: var(--color--text--tint-2);
	cursor: default;
}

.cancelBtn:disabled:hover {
	background: none;
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
	padding: var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.sectionLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.menuBtn {
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

.menuBtn:hover {
	background-color: var(--color--foreground--tint-1);
}

.modelDisplay {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background);
	cursor: pointer;
	gap: var(--spacing--2xs);
}

.modelDisplay:hover {
	border-color: var(--color--foreground--shade-1);
}

.modelDisplayContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	overflow: hidden;
}

.modelDisplayContent span:last-child {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modelConfig {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-2);
}

.modelConfigField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.providerOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credentialSetupBtn {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) dashed var(--color--foreground--shade-1);
	border-radius: var(--radius--lg);
	background: none;
	cursor: pointer;
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}

.credentialSetupBtn:hover {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.credentialDisplayBtn {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background);
	cursor: pointer;
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	color: var(--color--text);
	width: 100%;
	text-align: left;
}

.credentialDisplayBtn:hover {
	border-color: var(--color--foreground--shade-1);
}

.credentialDisplayBtn span {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
