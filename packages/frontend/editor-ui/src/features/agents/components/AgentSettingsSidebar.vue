<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nButton, N8nCallout, N8nIcon, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatHubConversationModel, ChatHubProvider, ChatModelDto } from '@n8n/api-types';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import type { AgentSchema } from '../types';
import { CHATHUB_TO_CATALOG, CATALOG_TO_CHATHUB } from '../provider-mapping';
import AgentToolsPanel from './AgentToolsPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentCodeEditor from './AgentCodeEditor.vue';

const locale = useI18n();
const usersStore = useUsersStore();
const chatStore = useChatStore();

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

// --- Model & credential state (reusing ChatHub infrastructure) ---
const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const instructions = ref(props.schema?.instructions ?? '');

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

// Build a ChatModelDto from the current schema so ModelSelector can show it as selected
const selectedAgent = computed<ChatModelDto | null>(() => {
	if (!props.schema?.model.provider || !props.schema?.model.name) return null;

	const chatHubProvider = CATALOG_TO_CHATHUB[props.schema.model.provider];
	if (!chatHubProvider) return null;

	return {
		model: {
			provider: chatHubProvider,
			model: props.schema.model.name,
		} as ChatHubConversationModel,
		name: props.schema.model.name,
		description: null,
		icon: null,
		updatedAt: null,
		createdAt: null,
		metadata: {} as ChatModelDto['metadata'],
		groupName: null,
		groupIcon: null,
	};
});

function onModelChange(selection: ChatHubConversationModel) {
	if (!isLlmProviderModel(selection)) return;

	const catalogProvider = CHATHUB_TO_CATALOG[selection.provider] ?? selection.provider;
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';

	emit('update:schema', {
		model: { provider: catalogProvider, name: selection.model },
		credential: credentialId,
	});
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);

	// If this is the currently selected provider, also update the schema credential
	const currentChatHubProvider = props.schema?.model.provider
		? CATALOG_TO_CHATHUB[props.schema.model.provider]
		: undefined;
	if (currentChatHubProvider === provider && credentialId) {
		emit('update:schema', { credential: credentialId });
	}
}

watch(
	() => props.schema,
	(schema) => {
		if (!schema) return;
		instructions.value = schema.instructions ?? '';
	},
	{ deep: true, immediate: true },
);

function onInstructionsChange(value: string) {
	instructions.value = value;
	emit('update:schema', { instructions: value });
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
					:agents="chatStore.agents"
					:is-loading="false"
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
