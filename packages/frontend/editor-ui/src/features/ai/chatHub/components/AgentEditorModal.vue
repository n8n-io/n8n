<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
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
	N8nDialogClose,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nHeading,
	N8nIconPicker,
	N8nInput,
	N8nInputLabel,
	N8nDialog,
	N8nSpinner,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import type { CredentialsMap } from '../chat.types';
import ToolsSelector from './ToolsSelector.vue';
import { personalAgentDefaultIcon, isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';

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

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			...selectedModel.value,
			credentialId: credentialIdForSelectedModelProvider.value,
			toolIds: toolIds.value,
			icon: icon.value,
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
</script>

<template>
	<N8nDialog :open="true" size="xlarge" @update:open="closeDialog">
		<template v-if="isLoadingAgent">
			<div :class="$style.loader">
				<N8nSpinner />
			</div>
		</template>
		<template v-else>
			<N8nDialogHeader>
				<div :class="$style.header">
					<N8nDialogTitle>
						<N8nHeading tag="h2" size="large">{{ title }}</N8nHeading>
					</N8nDialogTitle>
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
			</N8nDialogHeader>
			<div data-agent-editor-modal :class="$style.content">
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
								:checked-tool-ids="toolIds"
								@toggle="handleToggleAgentTool"
							/>
						</div>
					</N8nInputLabel>
				</div>
			</div>

			<N8nDialogFooter>
				<N8nDialogClose as-child>
					<N8nButton variant="subtle">
						{{ i18n.baseText('chatHub.tools.editor.cancel') }}
					</N8nButton>
				</N8nDialogClose>
				<N8nButton variant="solid" :disabled="!isValid || isSaving" @click="onSave">
					{{ saveButtonLabel }}
				</N8nButton>
			</N8nDialogFooter>
		</template>
	</N8nDialog>
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

.loader {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 200px;
}
</style>

<style lang="scss">
[role='dialog']:has([data-agent-editor-modal]) {
	background-color: var(--dialog--color--background);
}
</style>
