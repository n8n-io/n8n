<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	ChatHubConversationModel,
	ChatHubProvider,
	ChatModelDto,
	ChatModelsResponse,
} from '@n8n/api-types';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import type { AgentResource, AgentJsonConfig, AgentJsonToolRef } from '../types';
import type { CustomToolEntry } from '../agent.types';
import { AGENT_TOOL_CONFIG_MODAL_KEY } from '../constants';
import { getExistingToolNames, replaceToolRefInList } from '../composables/useAgentToolRefAdapter';
import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import {
	CHATHUB_TO_CATALOG,
	CATALOG_TO_CHATHUB,
	AGENT_UNSUPPORTED_PROVIDERS,
} from '../provider-mapping';
import AgentPublishButton from './AgentPublishButton.vue';
import AgentToolsPanel from './AgentToolsPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentIntegrationsPanel from './AgentIntegrationsPanel.vue';
import AgentConfigJsonEditor from './AgentConfigJsonEditor.vue';
import AgentCustomToolsList from './AgentCustomToolsList.vue';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
	config: AgentJsonConfig | null;
	agentTools: Record<string, CustomToolEntry>;
	projectId: string;
	agentId: string;
	agentName: string;
	updatedAt: string;
	agent: AgentResource | null;
	saveStatus: 'idle' | 'saving' | 'saved';
	building?: boolean;
	codeOnly?: boolean;
	agentStatus: 'draft' | 'production';
}>();

const emit = defineEmits<{
	'update:config': [changes: Partial<AgentJsonConfig>];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
}>();

const toolCount = computed(() => Object.keys(props.agentTools).length);

const locale = useI18n();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const uiStore = useUIStore();

// --- Model & credential state (reusing ChatHub infrastructure) ---
const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const instructions = ref(props.config?.instructions ?? '');

// Fetch agents when credentials are ready
watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) {
			void chatStore.fetchAgents(credentials);
		}
	},
	{ immediate: true },
);

/**
 * TODO: Add support for missing chathub providers
 */
const filteredAgents = computed<ChatModelsResponse>(
	() =>
		Object.fromEntries(
			Object.entries(chatStore.agents).filter(
				([provider]) => !AGENT_UNSUPPORTED_PROVIDERS.has(provider),
			),
		) as ChatModelsResponse,
);

/** Parse "provider/model" string into provider and model parts */
function parseModelString(model: string): { provider: string; name: string } | null {
	const slashIndex = model.indexOf('/');
	if (slashIndex <= 0) return null;
	return { provider: model.slice(0, slashIndex), name: model.slice(slashIndex + 1) };
}

// Build a ChatModelDto from the current config so ModelSelector can show it as selected
const selectedAgent = computed<ChatModelDto | null>(() => {
	if (!props.config?.model) return null;

	const parsed = parseModelString(props.config.model);
	if (!parsed) return null;

	const chatHubProvider = CATALOG_TO_CHATHUB[parsed.provider];
	if (!chatHubProvider) return null;

	return {
		model: {
			provider: chatHubProvider,
			model: parsed.name,
		} as ChatHubConversationModel,
		name: parsed.name,
		description: null,
		icon: null,
		updatedAt: null,
		createdAt: null,
		metadata: {} as ChatModelDto['metadata'],
		groupName: null,
		groupIcon: null,
	};
});

/** Strip "models/" prefix from Gemini model IDs (e.g. "models/gemini-2.5-flash" → "gemini-2.5-flash") */
function sanitizeGeminiModelId(provider: string, modelId: string): string {
	if (provider === 'google') {
		return modelId.replace(/^models\//, '');
	}
	return modelId;
}

function sanitizeModelId(provider: string, modelId: string): string {
	if (provider === 'google') {
		return sanitizeGeminiModelId(provider, modelId);
	}
	return modelId;
}

function onModelChange(selection: ChatHubConversationModel) {
	if (!isLlmProviderModel(selection)) return;

	const catalogProvider = CHATHUB_TO_CATALOG[selection.provider] ?? selection.provider;
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';

	emit('update:config', {
		model: `${catalogProvider}/${sanitizeModelId(catalogProvider, selection.model)}`,
		credential: credentialId,
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);

	// If this is the currently selected provider, also update the config credential
	if (props.config?.model) {
		const parsed = parseModelString(props.config.model);
		const currentChatHubProvider = parsed ? CATALOG_TO_CHATHUB[parsed.provider] : undefined;
		if (currentChatHubProvider === provider) {
			emit('update:config', { credential: credentialId ?? '' });
		}
	}
}

watch(
	() => props.config,
	(config) => {
		if (!config) return;
		instructions.value = config.instructions ?? '';
	},
	{ deep: true, immediate: true },
);

function onInstructionsChange(value: string) {
	instructions.value = value;
	emit('update:config', { instructions: value });
}

const toolTelemetry = useAgentToolTelemetry(props.agentId);

function openToolConfigModal(toolRef: AgentJsonToolRef) {
	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef,
			existingToolNames: getExistingToolNames(
				(props.config?.tools ?? []) as AgentJsonToolRef[],
				toolRef,
			),
			onConfirm: (updatedRef: AgentJsonToolRef) => {
				// Read the latest tools at confirm time — the array may have been
				// recreated while the modal was open. `replaceToolRefInList`
				// matches by stable `id` with a reference fallback, so edits land
				// on the right ref without clobbering concurrent additions.
				const latestTools = (props.config?.tools ?? []) as AgentJsonToolRef[];
				emit('update:config', {
					tools: replaceToolRefInList(latestTools, toolRef, updatedRef),
				});
				toolTelemetry.trackEdited(updatedRef);
			},
		},
	});
}

function onSidebarToolRemoved(toolRef: AgentJsonToolRef) {
	toolTelemetry.trackRemoved(toolRef);
}

// --- Collapsible sections ---
const expandedSections = ref<Record<string, boolean>>({
	triggers: false,
	tools: false,
	advanced: false,
	configJson: false,
	customTools: false,
});

function toggleSection(section: string) {
	expandedSections.value[section] = !expandedSections.value[section];
}

// Auto-expand "Tools" once if the agent already has configured tools — users
// shouldn't need to click to see what's there. Only fires on the first
// transition to >0 so manual collapse afterwards sticks.
let autoExpandedTools = false;
watch(
	() => (props.config?.tools ?? []).length,
	(count) => {
		if (!autoExpandedTools && count > 0) {
			expandedSections.value.tools = true;
			autoExpandedTools = true;
		}
	},
	{ immediate: true },
);

// Integrations status is async — `AgentIntegrationsPanel` fetches on mount
// and emits `update:connected-triggers` with the current list. Mirror the
// one-shot auto-expand behaviour: expand "Triggers" the first time we learn
// the agent has any connected integration, and don't force it re-open on
// later state changes. The list itself is also re-emitted upward so the
// builder view can telemetry-track config edits.
let autoExpandedTriggers = false;
function onTriggerConnectedTriggers(triggers: string[]) {
	if (!autoExpandedTriggers && triggers.length > 0) {
		expandedSections.value.triggers = true;
		autoExpandedTriggers = true;
	}
	emit('update:connected-triggers', triggers);
}

// Auto-expand the config editor while the builder is actively writing to it.
watch(
	() => props.building,
	(building) => {
		if (building) {
			expandedSections.value.configJson = true;
		}
	},
	{ immediate: true },
);

// When the sidebar is in code-only mode (builder chat active), auto-expand the
// config editor so it's visible without an extra click.
watch(
	() => props.codeOnly,
	(codeOnly) => {
		if (codeOnly) {
			expandedSections.value.configJson = true;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<aside :class="$style.sidebar">
		<!-- Sidebar header -->
		<div :class="$style.header">
			<N8nText tag="span" bold>{{ locale.baseText('agents.settings.title') }}</N8nText>
			<div :class="$style.headerRight">
				<N8nText v-if="saveStatus !== 'idle'" tag="span" size="small" :class="$style.saveStatus">
					{{
						saveStatus === 'saving'
							? locale.baseText('agents.builder.saving')
							: locale.baseText('agents.builder.saved')
					}}
				</N8nText>
				<AgentPublishButton
					:agent="agent"
					:project-id="projectId"
					:agent-id="agentId"
					:is-saving="saveStatus === 'saving'"
					@published="(a) => emit('published', a)"
					@unpublished="(a) => emit('unpublished', a)"
				/>
			</div>
		</div>

		<div :class="$style.body">
			<template v-if="!codeOnly">
				<!-- Model section -->
				<div :class="[$style.staticSection, $style.modelSection]">
					<div :class="$style.sectionLabel">
						<N8nText tag="span" bold size="small">{{
							locale.baseText('agents.settings.model')
						}}</N8nText>
					</div>
					<ModelSelector
						:selected-agent="selectedAgent"
						:include-custom-agents="false"
						:credentials="credentialsByProvider"
						:agents="filteredAgents"
						:is-loading="false"
						:warn-missing-credentials="true"
						horizontal
						@change="onModelChange"
						@select-credential="onSelectCredential"
					/>
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
					</button>
					<!--
						v-show (not v-if) so the integrations panel mounts + fetches even
						while the section is collapsed. That lets it emit `connected-count`
						so the sidebar can auto-expand the section on load when the agent
						already has integrations configured.
					-->
					<div v-show="expandedSections.triggers" :class="$style.sectionContent">
						<AgentIntegrationsPanel
							:project-id="projectId"
							:agent-id="agentId"
							:agent-name="agentName"
							@update:connected-triggers="onTriggerConnectedTriggers"
							@trigger-added="(payload) => emit('trigger-added', payload)"
						/>
					</div>
				</div>

				<!-- Tools (collapsible) -->
				<div :class="$style.section">
					<button :class="$style.sectionHeader" @click="toggleSection('tools')">
						<div :class="$style.sectionHeaderLeft">
							<N8nIcon
								:icon="expandedSections.tools ? 'chevron-down' : 'chevron-right'"
								:size="16"
							/>
							<N8nText tag="span" bold size="small">{{
								locale.baseText('agents.settings.tools')
							}}</N8nText>
						</div>
					</button>
					<div v-if="expandedSections.tools" :class="$style.sectionContent">
						<AgentToolsPanel
							:config="config"
							:agent-tools="agentTools"
							@update:config="(changes) => emit('update:config', changes)"
							@configure="openToolConfigModal"
							@remove="onSidebarToolRemoved"
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
					</button>
					<div v-if="expandedSections.advanced" :class="$style.sectionContent">
						<AgentMemoryPanel
							:config="config"
							@update:config="(changes) => emit('update:config', changes)"
						/>
					</div>
				</div>
			</template>

			<template v-if="codeOnly">
				<!-- Config JSON (collapsible top-level section) -->
				<div :class="$style.section">
					<button :class="$style.sectionHeader" @click="toggleSection('configJson')">
						<div :class="$style.sectionHeaderLeft">
							<N8nIcon
								:icon="expandedSections.configJson ? 'chevron-down' : 'chevron-right'"
								:size="16"
							/>
							<N8nText tag="span" bold size="small">{{
								locale.baseText('agents.settings.configJson')
							}}</N8nText>
							<N8nIcon v-if="building" icon="spinner" :size="14" spin />
						</div>
					</button>
					<div v-if="expandedSections.configJson" :class="$style.codeSection">
						<AgentConfigJsonEditor
							:config="config"
							:read-only="building"
							@update:config="(newConfig) => emit('update:config', newConfig)"
						/>
					</div>
				</div>

				<!-- Custom tools (collapsible top-level section; only shown if there are any) -->
				<div v-if="toolCount > 0" :class="$style.section">
					<button :class="$style.sectionHeader" @click="toggleSection('customTools')">
						<div :class="$style.sectionHeaderLeft">
							<N8nIcon
								:icon="expandedSections.customTools ? 'chevron-down' : 'chevron-right'"
								:size="16"
							/>
							<N8nText tag="span" bold size="small">{{
								locale.baseText('agents.settings.customTools')
							}}</N8nText>
							<span :class="$style.countBadge">{{ toolCount }}</span>
						</div>
					</button>
					<div v-if="expandedSections.customTools" :class="$style.codeSection">
						<AgentCustomToolsList :agent-tools="agentTools" />
					</div>
				</div>
			</template>
		</div>
	</aside>
</template>

<style module>
.sidebar {
	position: relative;
	width: 480px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	flex-shrink: 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 56px;
	min-height: 56px;
	padding: 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.headerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.saveStatus {
	color: var(--color--text--tint-2);
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
}

.modelSection {
	padding: var(--spacing--sm);
	border-bottom: 0;
	padding-bottom: 0;
}

.sectionLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.section {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.body > *:first-child {
	border-top: none;
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

.sectionContent {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.codeSection {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.countBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	margin-left: var(--spacing--3xs);
}
</style>
