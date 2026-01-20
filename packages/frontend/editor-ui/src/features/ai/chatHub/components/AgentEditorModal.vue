<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { fetchChatModelsApi, buildAgentAttachmentUrl } from '@/features/ai/chatHub/chat.api';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import {
	emptyChatModelsResponse,
	type ChatModelsResponse,
	type ChatHubBaseLLMModel,
	type AgentIconOrEmoji,
	type ChatHubConversationModel,
	type ChatHubProvider,
	type ChatModelDto,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nHeading,
	N8nIconButton,
	N8nIconPicker,
	N8nInput,
	N8nInputLabel,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { CredentialsMap } from '../chat.types';
import { VECTOR_STORE_SIMPLE_NODE_TYPE, type IBinaryData, type INode } from 'n8n-workflow';
import ToolsSelector from './ToolsSelector.vue';
import {
	personalAgentDefaultIcon,
	isLlmProviderModel,
	createMimeTypes,
} from '@/features/ai/chatHub/chat.utils';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';
import { useUIStore } from '@/app/stores/ui.store';
import { TOOLS_SELECTOR_MODAL_KEY } from '@/features/ai/chatHub/constants';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';

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
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const uiStore = useUIStore();

const modalBus = ref(createEventBus());
const { customAgent, isLoading: isLoadingCustomAgent } = useCustomAgent(props.data.agentId);

const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const selectedModel = ref<ChatHubBaseLLMModel | null>(null);
const isSaving = ref(false);
const isDeleting = ref(false);
const isOpened = ref(false);
const tools = ref<INode[]>([]);
const agents = ref<ChatModelsResponse>(emptyChatModelsResponse);
const isLoadingAgents = ref(false);
const nameInputRef = useTemplateRef('nameInput');
const icon = ref<AgentIconOrEmoji>(personalAgentDefaultIcon);
const files = ref<IBinaryData[]>([]);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput');

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

const acceptedMimeTypes = computed(() =>
	createMimeTypes(selectedAgent.value?.metadata.inputModalities ?? []),
);

const isValid = computed(
	() =>
		name.value.trim().length > 0 &&
		systemPrompt.value.trim().length > 0 &&
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

modalBus.value.once('opened', () => {
	isOpened.value = true;
});

// If the agent doesn't support tools anymore, reset tools
watch(
	selectedAgent,
	(agent) => {
		if (agent && !agent.metadata.capabilities.functionCalling) {
			tools.value = [];
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
		tools.value = agent.tools || [];
		files.value = agent.files;

		if (agent.credentialId) {
			agentSelectedCredentials.value[agent.provider] = agent.credentialId;
		}
	},
	{ immediate: true },
);

watch(
	[isOpened, isLoadingAgent, nameInputRef],
	([opened, isLoading, nameInput]) => {
		if (opened && !isLoading) {
			// autofocus attribute doesn't work in modal
			// https://github.com/element-plus/element-plus/issues/15250
			nameInput?.focus();
		}
	},
	{ immediate: true, flush: 'post' },
);

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

		// Build tools array including vector store if enabled
		const allTools: INode[] = [...tools.value];

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			...selectedModel.value,
			credentialId: credentialIdForSelectedModelProvider.value,
			tools: allTools,
			icon: icon.value,
			files: files.value.map((file) => ({ fileName: '', ...file })),
		};

		if (isEditMode.value && props.data.agentId) {
			await chatStore.updateCustomAgent(props.data.agentId, payload, props.data.credentials);
			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.update'),
				type: 'success',
			});
		} else {
			const agent = await chatStore.createCustomAgent(payload, props.data.credentials);
			props.data.onCreateCustomAgent?.(agent);

			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.create'),
				type: 'success',
			});
		}

		modalBus.value.emit('close');
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
		modalBus.value.emit('close');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '';
		toast.showError(error, i18n.baseText('chatHub.agent.editor.error.delete'), errorMessage);
	} finally {
		isDeleting.value = false;
	}
}

function onSelectTools() {
	uiStore.openModalWithData({
		name: TOOLS_SELECTOR_MODAL_KEY,
		data: {
			selected: tools.value,
			onConfirm: (newTools: INode[]) => {
				// Keep vector store tool if it exists, add other tools
				const vectorStoreTool = tools.value.find(
					(tool) => tool.type === VECTOR_STORE_SIMPLE_NODE_TYPE,
				);
				tools.value = vectorStoreTool ? [...newTools, vectorStoreTool] : newTools;
			},
		},
	});
}

function isFileTypeAccepted(file: File): boolean {
	const accepted = acceptedMimeTypes.value;
	if (!accepted) return false;
	if (accepted === '*/*') return true;

	const acceptedTypes = accepted.split(',').map((type) => type.trim());
	return acceptedTypes.some((acceptedType) => {
		if (acceptedType.endsWith('/*')) {
			// Handle wildcards like 'image/*', 'text/*'
			const prefix = acceptedType.slice(0, -2);
			return file.type.startsWith(prefix + '/');
		}
		return file.type === acceptedType;
	});
}

async function onFilesDropped(droppedFiles: File[]) {
	const acceptedFiles = droppedFiles.filter((file) => isFileTypeAccepted(file));

	if (acceptedFiles.length === 0) {
		return;
	}

	const binaryItems = await Promise.all(
		acceptedFiles.map(async (f) => await convertFileToBinaryData(f)),
	);

	files.value = [...files.value, ...binaryItems];
}

async function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement;
	if (!target.files) {
		return;
	}

	const acceptedFiles = Array.from(target.files).filter((file) => isFileTypeAccepted(file));

	if (acceptedFiles.length === 0) {
		target.value = '';
		return;
	}

	const binaryItems = await Promise.all(
		acceptedFiles.map(async (f) => await convertFileToBinaryData(f)),
	);

	files.value = [...files.value, ...binaryItems];

	// Reset input value to allow selecting the same file again
	target.value = '';
}

function removeFile(index: number) {
	files.value = files.value.filter((_, i) => i !== index);
}

function handleClickUploadArea() {
	fileInputRef.value?.click();
}

function handleFileClick(index: number) {
	if (!isEditMode.value || !props.data.agentId) {
		return;
	}

	const url = buildAgentAttachmentUrl(useRootStore().restApiContext, props.data.agentId, index);
	window.open(url, '_blank');
}

const fileDrop = useFileDrop(true, onFilesDropped);
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="600px"
		:center="true"
		:loading="isLoadingAgent"
		max-width="90%"
		min-height="400px"
	>
		<template #header>
			<div :class="$style.header">
				<N8nHeading tag="h2" size="large">{{ title }}</N8nHeading>
				<N8nButton
					v-if="isEditMode"
					type="secondary"
					icon="trash-2"
					:disabled="isDeleting"
					:loading="isDeleting"
					@click="onDelete"
				/>
			</div>
		</template>
		<template #content>
			<div
				:class="[$style.content, { [$style.isDraggingFile]: fileDrop.isDragging.value }]"
				@dragenter="fileDrop.handleDragEnter"
				@dragleave="fileDrop.handleDragLeave"
				@dragover="fileDrop.handleDragOver"
				@drop="fileDrop.handleDrop"
			>
				<div v-if="fileDrop.isDragging.value" :class="$style.dropOverlay">
					<N8nText size="large" color="text-dark">Add file to agent</N8nText>
				</div>
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
					:required="true"
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
										: i18n.baseText('chatHub.tools.selector.disabled.tooltip')
								"
								:selected="tools"
								@click="onSelectTools"
							/>
						</div>
					</N8nInputLabel>
				</div>

				<N8nInputLabel input-name="agent-files" label="Files" :required="false">
					<input
						ref="fileInput"
						type="file"
						:class="$style.fileInput"
						:accept="acceptedMimeTypes"
						multiple
						@change="handleFileSelect"
					/>
					<div :class="$style.filesContainer">
						<div
							v-for="(file, index) in files"
							:key="String(index)"
							:class="$style.fileBar"
							@click="handleFileClick(index)"
						>
							<N8nIcon size="medium" icon="file" />
							<span :class="$style.fileName">
								{{ file.fileName }}
							</span>
							<N8nIconButton
								icon="trash-2"
								type="tertiary"
								size="small"
								:class="$style.removeButton"
								@click.stop="removeFile(index)"
							/>
						</div>
						<N8nButton
							type="tertiary"
							icon="plus"
							:class="$style.addFileButton"
							@click="handleClickUploadArea"
						>
							Add file
						</N8nButton>
					</div>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" @click="modalBus.emit('close')">{{
					i18n.baseText('chatHub.tools.editor.cancel')
				}}</N8nButton>
				<N8nButton type="primary" :disabled="!isValid || isSaving" @click="onSave">
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

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
	position: relative;
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
	align-items: center;
	gap: var(--spacing--2xs);
}

.fileInput {
	display: none;
}

.filesContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.fileBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	gap: var(--spacing--3xs);
	cursor: pointer;
}

.addFileButton {
	width: fit-content;
}

.fileName {
	flex: 1;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--xl);
}

.removeButton {
	flex-shrink: 0;
}

.vectorStoreFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
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
