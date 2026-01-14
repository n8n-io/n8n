<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { fetchChatModelsApi } from '@/features/ai/chatHub/chat.api';
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
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref, useTemplateRef, watch } from 'vue';
import type { CredentialsMap } from '../chat.types';
import type { INode } from 'n8n-workflow';
import ToolsSelector from './ToolsSelector.vue';
import { personalAgentDefaultIcon, isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';
import { useUIStore } from '@/app/stores/ui.store';
import { TOOLS_SELECTOR_MODAL_KEY } from '@/features/ai/chatHub/constants';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';

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
const files = ref<File[]>([]);
const existingFiles = ref<Array<{ data: string; mimeType: string; fileName: string }>>([]);
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput');
const canAcceptFiles = ref(true);

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

const isValid = computed(() => {
	return (
		name.value.trim().length > 0 &&
		systemPrompt.value.trim().length > 0 &&
		selectedModel.value !== null &&
		!!credentialIdForSelectedModelProvider.value
	);
});

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

		// Load existing files
		if (agent.files && agent.files.length > 0) {
			existingFiles.value = agent.files
				.filter(
					(file: { data?: string; mimeType?: string; fileName?: string }) =>
						file.data && file.mimeType && file.fileName,
				)
				.map((file: { data: string; mimeType: string; fileName: string }) => ({
					data: file.data,
					mimeType: file.mimeType,
					fileName: file.fileName,
				}));
		} else {
			existingFiles.value = [];
		}

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

async function convertFilesToBinaryData(files: File[]) {
	const binaryDataArray = [];

	for (const file of files) {
		const base64Data = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Remove the data URL prefix (e.g., "data:application/pdf;base64,")
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});

		binaryDataArray.push({
			data: base64Data,
			mimeType: file.type,
			fileName: file.name,
		});
	}

	return binaryDataArray;
}

async function onSave() {
	if (!isValid.value || isSaving.value) return;

	isSaving.value = true;
	try {
		assert(selectedModel.value);
		assert(credentialIdForSelectedModelProvider.value);

		const newBinaryFiles = await convertFilesToBinaryData(files.value);
		// Combine existing files (that weren't removed) with newly uploaded files
		const allFiles = [...existingFiles.value, ...newBinaryFiles];

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			...selectedModel.value,
			credentialId: credentialIdForSelectedModelProvider.value,
			tools: tools.value,
			icon: icon.value,
			files: allFiles,
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
				tools.value = newTools;
			},
		},
	});
}

function onFilesDropped(droppedFiles: File[]) {
	const pdfFiles = droppedFiles.filter((file) => file.type === 'application/pdf');
	if (pdfFiles.length > 0) {
		files.value = [...files.value, ...pdfFiles];
	}
}

function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement;
	if (target.files) {
		const pdfFiles = Array.from(target.files).filter((file) => file.type === 'application/pdf');
		if (pdfFiles.length > 0) {
			files.value = [...files.value, ...pdfFiles];
		}
	}
	// Reset input value to allow selecting the same file again
	target.value = '';
}

function removeFile(index: number) {
	files.value = files.value.filter((_, i) => i !== index);
}

function removeExistingFile(index: number) {
	existingFiles.value = existingFiles.value.filter((_, i) => i !== index);
}

function handleClickUploadArea() {
	fileInputRef.value?.click();
}

const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);
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
			<div :class="$style.content">
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
						accept="application/pdf"
						multiple
						@change="handleFileSelect"
					/>
					<div
						:class="[$style.uploadArea, { [$style.uploadAreaDragging]: fileDrop.isDragging.value }]"
						@click="handleClickUploadArea"
						@dragenter="fileDrop.handleDragEnter"
						@dragleave="fileDrop.handleDragLeave"
						@dragover="fileDrop.handleDragOver"
						@drop="fileDrop.handleDrop"
					>
						<div
							v-if="files.length === 0 && existingFiles.length === 0"
							:class="$style.uploadPrompt"
						>
							<span :class="$style.uploadText"> Click to upload or drag and drop PDF files </span>
						</div>
						<div v-else :class="$style.filesList">
							<div
								v-for="(file, index) in existingFiles"
								:key="`existing-${index}`"
								:class="$style.fileItem"
							>
								<span :class="$style.fileName">{{ file.fileName }}</span>
								<N8nIconButton
									icon="trash-2"
									type="tertiary"
									size="small"
									:class="$style.removeButton"
									@click.stop="removeExistingFile(index)"
								/>
							</div>
							<div v-for="(file, index) in files" :key="`new-${index}`" :class="$style.fileItem">
								<span :class="$style.fileName">{{ file.name }}</span>
								<N8nIconButton
									icon="trash-2"
									type="tertiary"
									size="small"
									:class="$style.removeButton"
									@click.stop="removeFile(index)"
								/>
							</div>
						</div>
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

.uploadArea {
	min-height: 100px;
	border: var(--border-width) dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
	cursor: pointer;
	transition: all 0.2s ease;
	background-color: var(--color--background);

	&:hover {
		border-color: var(--color--primary);
		background-color: var(--color--background--light-2);
	}
}

.uploadAreaDragging {
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.uploadPrompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-2);
	text-align: center;
}

.uploadText {
	font-size: var(--font-size--sm);
}

.filesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.fileItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius);
	gap: var(--spacing--xs);
}

.fileName {
	flex: 1;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.removeButton {
	flex-shrink: 0;
}
</style>
