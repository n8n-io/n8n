<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { fetchChatModelsApi } from '@/features/ai/chatHub/chat.api';
import Modal from '@/app/components/Modal.vue';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import {
	emptyChatModelsResponse,
	type ChatModelsResponse,
	type ChatHubBaseLLMModel,
	type AgentIconOrEmoji,
	type ChatHubConversationModel,
	type ChatHubProvider,
	type ChatModelDto,
	type ChatHubAgentKnowledgeItem,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nHeading,
	N8nIconPicker,
	N8nInput,
	N8nInputLabel,
	N8nText,
	N8nCallout,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { SuggestedPrompt } from '@n8n/api-types';
import type { CredentialsMap } from '../chat.types';
import SuggestedPromptsEditor from './SuggestedPromptsEditor.vue';
import ToolsSelector from './ToolsSelector.vue';
import { personalAgentDefaultIcon, isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import { CHAT_SETTINGS_VIEW } from '@/features/ai/chatHub/constants';
import AgentEditorModalFileRow, {
	type FileRow,
} from '@/features/ai/chatHub/components/AgentEditorModalFileRow.vue';
import { I18nT } from 'vue-i18n';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';
import { usePostHog } from '@/app/stores/posthog.store';
import { CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';

const props = defineProps<{
	modalName: string;
	data: {
		agentId?: string;
		credentials: CredentialsMap;
		onClose?: () => void;
		onCreateCustomAgent?: (selection: ChatModelDto) => void;
	};
}>();

const chatStore = useChatStore();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();

const canConfigureVectorStore = computed(() => usersStore.isInstanceOwner);
const canUploadFiles = computed(() => chatStore.semanticSearchReadiness.isReadyForCurrentUser);
const toast = useToast();
const message = useMessage();
const uiStore = useUIStore();

const { customAgent, isLoading: isLoadingCustomAgent } = useCustomAgent(props.data.agentId);

const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const selectedModel = ref<ChatHubBaseLLMModel | null>(null);
const isSaving = ref(false);
const isDeleting = ref(false);
const toolIds = ref<string[]>([]);
const agents = ref<ChatModelsResponse>(emptyChatModelsResponse);
const isLoadingAgents = ref(false);
const nameInputRef = useTemplateRef('nameInput');
const icon = ref<AgentIconOrEmoji>(personalAgentDefaultIcon);
const savedFiles = ref<ChatHubAgentKnowledgeItem[]>([]);
const newFiles = ref<File[]>([]);
const removedFileKnowledgeIds = ref<string[]>([]);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput');

const currentEmbeddingProvider = computed(
	() => settingsStore.moduleSettings['chat-hub']?.semanticSearch.embeddingModel.provider ?? null,
);

const allFiles = computed<FileRow[]>(() => [
	...savedFiles.value.map((file, index) => ({
		id: `saved-${index}`,
		name: file.fileName,
		mimeType: file.mimeType,
		isNew: false,
		embeddingProvider: file.provider,
		index,
	})),
	...newFiles.value.map((file, index) => ({
		id: `new-${index}`,
		name: file.name,
		mimeType: file.type,
		isNew: true,
		embeddingProvider: null,
		index,
	})),
]);
const suggestedPrompts = ref<SuggestedPrompt[]>([]);

const agentSelectedCredentials = ref<CredentialsMap>({});
const credentialIdForSelectedModelProvider = computed(
	() => selectedModel.value && agentMergedCredentials.value[selectedModel.value.provider],
);
const selectedAgent = computed(
	() =>
		selectedModel.value &&
		chatStore.getAgent(selectedModel.value, { name: selectedModel.value.model }),
);

const isEditMode = computed(() => !!props.data.agentId);
const isLoadingAgent = computed(() => isEditMode.value && isLoadingCustomAgent.value);
const title = computed(() =>
	isEditMode.value
		? i18n.baseText('chatHub.agent.editor.title.edit')
		: i18n.baseText('chatHub.agent.editor.title.new'),
);
const saveButtonLabel = computed(() =>
	isSaving.value
		? i18n.baseText('chatHub.agent.editor.saving')
		: i18n.baseText('chatHub.agent.editor.save'),
);

const isValid = computed(
	() =>
		name.value.trim().length > 0 &&
		selectedModel.value !== null &&
		!!credentialIdForSelectedModelProvider.value,
);

const agentMergedCredentials = computed((): CredentialsMap => {
	return {
		...props.data.credentials,
		...agentSelectedCredentials.value,
	};
});

const canSelectTools = computed(
	() => selectedAgent.value?.metadata.capabilities.functionCalling ?? false,
);

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

// If the agent doesn't support tools anymore, reset toolIds
watch(
	selectedAgent,
	(agent) => {
		if (agent && !agent.metadata.capabilities.functionCalling) {
			toolIds.value = [];
		}
	},
	{ immediate: true },
);

watch(
	customAgent,
	(agent) => {
		if (!agent) return;

		icon.value = agent.icon ?? personalAgentDefaultIcon;
		name.value = agent.name;
		description.value = agent.description ?? '';
		systemPrompt.value = agent.systemPrompt;
		selectedModel.value = { provider: agent.provider, model: agent.model };
		savedFiles.value = agent.files;
		newFiles.value = [];
		removedFileKnowledgeIds.value = [];
		suggestedPrompts.value = agent.suggestedPrompts;
		toolIds.value = agent.toolIds ?? [];

		if (agent.credentialId) {
			agentSelectedCredentials.value[agent.provider] = agent.credentialId;
		}
	},
	{ immediate: true },
);

// Auto-focus name input when mounted and not loading
onMounted(() => {
	watch(
		[isLoadingAgent, nameInputRef],
		([isLoading, nameInput]) => {
			if (!isLoading) {
				nameInput?.focus();
			}
		},
		{ immediate: true, flush: 'post' },
	);
});

// Update agents when credentials are updated
watch(
	agentMergedCredentials,
	async (credentials) => {
		if (credentials) {
			isLoadingAgents.value = true;
			try {
				agents.value = await fetchChatModelsApi(useRootStore().restApiContext, { credentials });
			} finally {
				isLoadingAgents.value = false;
			}
		}
	},
	{ immediate: true },
);

function onCredentialSelected(provider: ChatHubProvider, credentialId: string | null) {
	agentSelectedCredentials.value = {
		...agentSelectedCredentials.value,
		[provider]: credentialId,
	};
}

function handleToggleAgentTool(toolId: string) {
	if (toolIds.value.includes(toolId)) {
		toolIds.value = toolIds.value.filter((id) => id !== toolId);
	} else {
		toolIds.value = [...toolIds.value, toolId];
	}
}

function onModelChange(model: ChatHubConversationModel) {
	assert(isLlmProviderModel(model));
	selectedModel.value = model;
}

async function onSave() {
	if (!isValid.value || isSaving.value) return;

	isSaving.value = true;
	try {
		assert(selectedModel.value);
		assert(credentialIdForSelectedModelProvider.value);

		const filteredPrompts = suggestedPrompts.value.filter((p) => p.text.trim().length > 0);

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			...selectedModel.value,
			credentialId: credentialIdForSelectedModelProvider.value,
			toolIds: toolIds.value,
			icon: icon.value,
			suggestedPrompts: filteredPrompts.length > 0 ? filteredPrompts : undefined,
		};

		// Capture before async calls — the customAgent watcher resets newFiles mid-await
		const addedFiles = [...newFiles.value];

		if (isEditMode.value && props.data.agentId) {
			await chatStore.updateCustomAgent(
				props.data.agentId,
				payload,
				addedFiles,
				removedFileKnowledgeIds.value,
				props.data.credentials,
			);
			if (addedFiles.length > 0) {
				const totalSizeMb = addedFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
				telemetry.track('User added files to personal agent', {
					count: addedFiles.length,
					total_size_mb: totalSizeMb,
					agent_id: props.data.agentId,
				});
			}
			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.update'),
				type: 'success',
			});
		} else {
			const agent = await chatStore.createCustomAgent(payload, addedFiles, props.data.credentials);
			if (addedFiles.length > 0) {
				const totalSizeMb = addedFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
				telemetry.track('User added files to personal agent', {
					count: addedFiles.length,
					total_size_mb: totalSizeMb,
					agent_id: agent.model.provider === 'custom-agent' ? agent.model.agentId : undefined,
				});
			}
			props.data.onCreateCustomAgent?.(agent);

			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.create'),
				type: 'success',
			});
		}

		closeDialog();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '';
		toast.showError(error, i18n.baseText('chatHub.agent.editor.error.save'), errorMessage);
	} finally {
		isSaving.value = false;
	}
}

async function onDelete() {
	if (!isEditMode.value || !props.data.agentId || isDeleting.value) return;

	const confirmed = await message.confirm(
		i18n.baseText('chatHub.agent.editor.delete.confirm.message'),
		i18n.baseText('chatHub.agent.editor.delete.confirm.title'),
		{
			confirmButtonText: i18n.baseText('chatHub.agent.editor.delete.confirm.button'),
			cancelButtonText: i18n.baseText('chatHub.agent.editor.delete.cancel.button'),
			type: 'warning',
		},
	);

	if (confirmed !== 'confirm') return;

	isDeleting.value = true;
	try {
		await chatStore.deleteCustomAgent(props.data.agentId, props.data.credentials);
		toast.showMessage({
			title: i18n.baseText('chatHub.agent.editor.success.delete'),
			type: 'success',
		});
		props.data.onClose?.();
		closeDialog();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '';
		toast.showError(error, i18n.baseText('chatHub.agent.editor.error.delete'), errorMessage);
	} finally {
		isDeleting.value = false;
	}
}

function isFileTypeAccepted(file: File): boolean {
	return file.type === 'application/pdf';
}

function onFilesDropped(droppedFiles: File[]) {
	const acceptedFiles = droppedFiles.filter((file) => isFileTypeAccepted(file));

	if (acceptedFiles.length === 0) {
		return;
	}

	newFiles.value = [...newFiles.value, ...acceptedFiles];
}

function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement;
	if (!target.files) {
		return;
	}

	const acceptedFiles = Array.from(target.files).filter((file) => isFileTypeAccepted(file));

	if (acceptedFiles.length === 0) {
		target.value = '';
		return;
	}

	newFiles.value = [...newFiles.value, ...acceptedFiles];

	// Reset input value to allow selecting the same file again
	target.value = '';
}

function removeExistingFile(index: number) {
	const file = savedFiles.value[index];
	if (file) {
		removedFileKnowledgeIds.value = [...removedFileKnowledgeIds.value, file.id];
	}
	savedFiles.value = savedFiles.value.filter((_, i) => i !== index);
}

function removeNewFile(index: number) {
	newFiles.value = newFiles.value.filter((_, i) => i !== index);
}

function handleClickUploadArea() {
	fileInputRef.value?.click();
}

function removeFile(row: FileRow) {
	if (row.isNew) {
		removeNewFile(row.index);
	} else {
		removeExistingFile(row.index);
	}
}

const posthogStore = usePostHog();
const telemetry = useTelemetry();
const isSemanticSearchEnabled = computed(() =>
	posthogStore.isVariantEnabled(
		CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT.name,
		CHAT_HUB_SEMANTIC_SEARCH_EXPERIMENT.variant,
	),
);

const fileDrop = useFileDrop(true, onFilesDropped, ['application/pdf']);
</script>

<template>
	<Modal :name="modalName" width="640px" :loading="isLoadingAgent">
		<template #header>
			<div :class="$style.header">
				<N8nHeading tag="h2" size="large">{{ title }}</N8nHeading>
				<N8nButton
					v-if="isEditMode"
					variant="subtle"
					icon="trash-2"
					:class="$style.deleteButton"
					:disabled="isDeleting"
					:loading="isDeleting"
					@click="onDelete"
				/>
			</div>
		</template>
		<template #content>
			<div :class="$style.contentWrapper">
				<div
					v-if="isSemanticSearchEnabled && fileDrop.isDragging.value"
					:class="$style.dropOverlay"
				>
					<N8nText v-if="fileDrop.isDraggingUnsupported.value" size="large" color="text-dark">{{
						i18n.baseText('chatHub.agent.editor.dropOverlay.unsupportedFileType')
					}}</N8nText>
					<N8nText v-else size="large" color="text-dark">{{
						i18n.baseText('chatHub.agent.editor.dropOverlay.addFile')
					}}</N8nText>
				</div>
				<div
					:class="[
						$style.content,
						{ [$style.isDraggingFile]: isSemanticSearchEnabled && fileDrop.isDragging.value },
					]"
					@dragenter="
						isSemanticSearchEnabled && canUploadFiles ? fileDrop.handleDragEnter($event) : undefined
					"
					@dragleave="
						isSemanticSearchEnabled && canUploadFiles ? fileDrop.handleDragLeave($event) : undefined
					"
					@dragover="
						isSemanticSearchEnabled && canUploadFiles ? fileDrop.handleDragOver($event) : undefined
					"
					@drop="
						isSemanticSearchEnabled && canUploadFiles ? fileDrop.handleDrop($event) : undefined
					"
				>
					<N8nInputLabel
						input-name="agent-name"
						:label="i18n.baseText('chatHub.agent.editor.name.label')"
						:required="true"
					>
						<div :class="$style.agentName">
							<N8nIconPicker
								v-model="icon as IconOrEmoji"
								:button-tooltip="i18n.baseText('chatHub.agent.editor.iconPicker.button.tooltip')"
							/>
							<N8nInput
								id="agent-name"
								ref="nameInput"
								v-model="name"
								:placeholder="i18n.baseText('chatHub.agent.editor.name.placeholder')"
								:maxlength="128"
								:class="$style.agentNameInput"
							/>
						</div>
					</N8nInputLabel>

					<N8nInputLabel
						input-name="agent-description"
						:label="i18n.baseText('chatHub.agent.editor.description.label')"
					>
						<N8nInput
							id="agent-description"
							v-model="description"
							type="textarea"
							:placeholder="i18n.baseText('chatHub.agent.editor.description.placeholder')"
							:maxlength="512"
							:rows="3"
							:class="$style.input"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						input-name="agent-system-prompt"
						:label="i18n.baseText('chatHub.agent.editor.systemPrompt.label')"
					>
						<N8nInput
							id="agent-system-prompt"
							v-model="systemPrompt"
							type="textarea"
							:placeholder="i18n.baseText('chatHub.agent.editor.systemPrompt.placeholder')"
							:rows="6"
							:class="$style.input"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						input-name="agent-suggested-prompts"
						:label="i18n.baseText('chatHub.agent.editor.suggestedPrompts.label')"
						:tooltip-text="i18n.baseText('chatHub.agent.editor.suggestedPrompts.tooltip')"
						:show-tooltip="true"
					>
						<SuggestedPromptsEditor v-model="suggestedPrompts" />
					</N8nInputLabel>

					<div :class="$style.row">
						<N8nInputLabel
							input-name="agent-model"
							:class="$style.input"
							:label="i18n.baseText('chatHub.agent.editor.model.label')"
							:required="true"
						>
							<ModelSelector
								:selected-agent="selectedAgent"
								:include-custom-agents="false"
								:credentials="agentMergedCredentials"
								:agents="agents"
								:is-loading="isLoadingAgents"
								:class="$style.modelSelector"
								warn-missing-credentials
								@change="onModelChange"
								@select-credential="onCredentialSelected"
							/>
						</N8nInputLabel>

						<N8nInputLabel
							input-name="agent-tool"
							:class="$style.input"
							:label="i18n.baseText('chatHub.agent.editor.tools.label')"
							:required="false"
						>
							<div>
								<ToolsSelector
									:disabled="!canSelectTools"
									:disabled-tooltip="
										canSelectTools
											? undefined
											: selectedModel
												? i18n.baseText('chatHub.tools.selector.disabled.tooltip')
												: i18n.baseText('chatHub.tools.selector.disabled.noModel.tooltip')
									"
									:checked-tool-ids="toolIds"
									@toggle="handleToggleAgentTool"
								/>
							</div>
						</N8nInputLabel>
					</div>

					<N8nInputLabel
						v-if="isSemanticSearchEnabled"
						input-name="agent-files"
						:label="i18n.baseText('chatHub.agent.editor.files.label')"
						:required="false"
					>
						<input
							ref="fileInput"
							type="file"
							:class="$style.fileInput"
							accept="application/pdf"
							multiple
							@change="handleFileSelect"
						/>
						<N8nCallout
							v-if="!canUploadFiles"
							theme="info"
							icon="info"
							:class="$style.vectorStoreCallout"
						>
							<I18nT
								:keypath="
									canConfigureVectorStore
										? 'chatHub.agent.editor.semanticSearch.notReady.canConfigure'
										: 'chatHub.agent.editor.semanticSearch.notReady'
								"
								tag="span"
								scope="global"
							>
								<template #settingsLink>
									<RouterLink
										:to="{ name: CHAT_SETTINGS_VIEW }"
										target="_blank"
										:class="$style.settingsLink"
										>{{
											i18n.baseText('chatHub.agent.editor.semanticSearch.settingsLink')
										}}</RouterLink
									>
								</template>
							</I18nT>
						</N8nCallout>
						<div v-if="allFiles.length > 0" :class="$style.fileList">
							<AgentEditorModalFileRow
								v-for="item in allFiles"
								:key="item.id"
								:item="item"
								:semantic-search-ready="canUploadFiles"
								:current-embedding-provider="currentEmbeddingProvider"
								@remove="removeFile(item)"
							/>
						</div>
						<N8nButton
							type="tertiary"
							icon="plus"
							variant="subtle"
							:class="$style.addFileButton"
							:disabled="!canUploadFiles"
							@click="handleClickUploadArea"
						>
							Add file
						</N8nButton>
					</N8nInputLabel>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="closeDialog">
					{{ i18n.baseText('chatHub.tools.editor.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!isValid || isSaving" @click="onSave">
					{{ saveButtonLabel }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--s);
	padding-right: var(--spacing--xl);
}

.deleteButton {
	margin-top: calc(-1 * var(--spacing--xs));
}

.contentWrapper {
	position: relative;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
	padding-right: var(--spacing--lg);
	max-height: 60vh;
	overflow-y: auto;
	margin-right: calc(-1 * var(--spacing--lg));
}

.vectorStoreCallout {
	margin-bottom: var(--spacing--xs);
}

.settingsLink {
	color: inherit;
	text-decoration: underline;
}

.isDraggingFile {
	border-color: var(--color--secondary);
}

.dropOverlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--color--background--light-2) 95%, transparent);
	pointer-events: none;
}

.input {
	width: 100%;
}

.agentName {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.agentNameInput {
	flex: 1;
}

.row {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);
}

.modelSelector {
	width: fit-content;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.fileInput {
	display: none;
}

.addFileButton {
	width: fit-content;
	margin-top: var(--spacing--2xs);
}

.fileList {
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.credentialPickerRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.credentialPicker {
	flex: 1;
}
</style>
