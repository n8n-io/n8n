<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import type { ChatHubBaseLLMModel, ChatHubProvider, ChatModelDto } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nInput, N8nInputLabel, N8nSpinner } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref, watch } from 'vue';
import type { CredentialsMap } from '../chat.types';
import type { INode } from 'n8n-workflow';
import ToolsSelector from './ToolsSelector.vue';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
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
const modalBus = ref(createEventBus());
const customAgent = useCustomAgent(props.data.agentId);

const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const selectedModel = ref<ChatHubBaseLLMModel | null>(null);
const isSaving = ref(false);
const isDeleting = ref(false);
const tools = ref<INode[]>([]);

const agentSelectedCredentials = ref<CredentialsMap>({});
const credentialIdForSelectedModelProvider = computed(
	() => selectedModel.value && agentMergedCredentials.value[selectedModel.value.provider],
);
const selectedAgent = computed(
	() => selectedModel.value && chatStore.getAgent(selectedModel.value),
);

const isEditMode = computed(() => !!props.data.agentId);
const isLoadingAgent = computed(() => isEditMode.value && !customAgent.value);
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

watch(
	customAgent,
	(agent) => {
		if (!agent) return;

		name.value = agent.name;
		description.value = agent.description ?? '';
		systemPrompt.value = agent.systemPrompt;
		selectedModel.value = { provider: agent.provider, model: agent.model };
		tools.value = agent.tools || [];

		if (agent.credentialId) {
			agentSelectedCredentials.value[agent.provider] = agent.credentialId;
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

function onModelChange(agent: ChatModelDto) {
	assert(isLlmProviderModel(agent.model));
	selectedModel.value = agent.model;
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
			tools: tools.value,
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

function onSelectTools(newTools: INode[]) {
	tools.value = newTools;
}
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="600px"
		:center="true"
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
					<N8nInput
						id="agent-name"
						v-model="name"
						:placeholder="i18n.baseText('chatHub.agent.editor.name.placeholder')"
						:maxlength="128"
						:class="$style.input"
						:disabled="isLoadingAgent"
					/>
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
						:disabled="isLoadingAgent"
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
						:disabled="isLoadingAgent"
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
							:disabled="isLoadingAgent"
							@change="onModelChange"
							@select-credential="onCredentialSelected"
						/>
					</N8nInputLabel>

					<N8nInputLabel
						input-name="agent-model"
						:class="$style.input"
						:label="i18n.baseText('chatHub.agent.editor.tools.label')"
						:required="false"
					>
						<div>
							<ToolsSelector :disabled="isLoadingAgent" :selected="tools" @select="onSelectTools" />
						</div>
					</N8nInputLabel>
				</div>
				<N8nSpinner v-if="isLoadingAgent" :class="$style.spinner" size="xlarge" />
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
.spinner {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
}

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

.row {
	display: flex;
	flex-direction: row;
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
