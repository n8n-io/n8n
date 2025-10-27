<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import Modal from '@/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ChatHubConversationModel, ChatHubProvider } from '@n8n/api-types';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { assert } from '@n8n/utils/assert';
import type { CredentialsMap } from '../chat.types';

const props = defineProps<{
	credentials: CredentialsMap;
	agentId?: string;
}>();

const emit = defineEmits<{
	createAgent: [agent: ChatHubConversationModel];
	close: [];
}>();

const chatStore = useChatStore();
const uiStore = useUIStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const modalBus = ref(createEventBus());

const name = ref('');
const description = ref('');
const systemPrompt = ref('');
const selectedModel = ref<ChatHubConversationModel | null>(null);
const isSaving = ref(false);
const isDeleting = ref(false);

const agentSelectedCredentials = ref<CredentialsMap>({});

const isEditMode = computed(() => !!props.agentId);
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
		selectedModel.value !== null
	);
});

const agentMergedCredentials = computed((): CredentialsMap => {
	return {
		...props.credentials,
		...agentSelectedCredentials.value,
	};
});

function loadAgent() {
	const agent = chatStore.currentEditingAgent;
	if (!agent) return;

	name.value = agent.name;
	description.value = agent.description ?? '';
	systemPrompt.value = agent.systemPrompt;
	if (agent.provider && agent.model) {
		selectedModel.value = {
			provider: agent.provider,
			model: agent.model,
			name: agent.model,
		} as ChatHubConversationModel;

		if (agent.credentialId) {
			agentSelectedCredentials.value[agent.provider] = agent.credentialId;
		}
	} else {
		selectedModel.value = null;
	}
}

function resetForm() {
	name.value = '';
	description.value = '';
	systemPrompt.value = '';
	selectedModel.value = null;
	agentSelectedCredentials.value = {};
}

// Watch for modal opening
watch(
	() => uiStore.isModalActiveById.agentEditor,
	(isOpen) => {
		if (isOpen) {
			if (props.agentId) {
				loadAgent();
			} else {
				resetForm();
			}
		}
	},
);

function onCredentialSelected(provider: ChatHubProvider, credentialId: string) {
	agentSelectedCredentials.value = {
		...agentSelectedCredentials.value,
		[provider]: credentialId,
	};
}

function onModelChange(model: ChatHubConversationModel) {
	selectedModel.value = model;
}

async function onSave() {
	if (!isValid.value || isSaving.value) return;

	isSaving.value = true;
	try {
		assert(selectedModel.value);
		const model = 'model' in selectedModel.value ? selectedModel.value.model : undefined;
		assert(model);

		const provider = selectedModel.value.provider;
		assert(provider !== 'n8n' && provider !== 'custom-agent');

		const credentialId = agentMergedCredentials.value[provider];
		assert(credentialId);

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			provider,
			model,
			credentialId,
		};

		if (isEditMode.value && props.agentId) {
			await chatStore.updateAgent(props.agentId, payload);
			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.update'),
				type: 'success',
			});
		} else {
			const agent = await chatStore.createAgent(payload);
			emit('createAgent', agent);

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
	if (!isEditMode.value || !props.agentId || isDeleting.value) return;

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
		await chatStore.deleteAgent(props.agentId);
		toast.showMessage({
			title: i18n.baseText('chatHub.agent.editor.success.delete'),
			type: 'success',
		});
		emit('close');
		modalBus.value.emit('close');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '';
		toast.showError(error, i18n.baseText('chatHub.agent.editor.error.delete'), errorMessage);
	} finally {
		isDeleting.value = false;
	}
}
</script>

<template>
	<Modal
		name="agentEditor"
		:event-bus="modalBus"
		width="600px"
		:center="true"
		max-width="90%"
		min-height="400px"
	>
		<template #header>
			<div :class="$style.header">
				<h2 :class="$style.title">{{ title }}</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<div :class="$style.field">
					<N8nText tag="label" size="small" bold :class="$style.label">
						{{ i18n.baseText('chatHub.agent.editor.name.label') }}
						<span :class="$style.required">*</span>
					</N8nText>
					<N8nInput
						v-model="name"
						:placeholder="i18n.baseText('chatHub.agent.editor.name.placeholder')"
						:maxlength="128"
						:class="$style.input"
					/>
				</div>

				<div :class="$style.field">
					<N8nText tag="label" size="small" bold :class="$style.label">{{
						i18n.baseText('chatHub.agent.editor.description.label')
					}}</N8nText>
					<N8nInput
						v-model="description"
						type="textarea"
						:placeholder="i18n.baseText('chatHub.agent.editor.description.placeholder')"
						:maxlength="512"
						:rows="3"
						:class="$style.input"
					/>
				</div>

				<div :class="$style.field">
					<N8nText tag="label" size="small" bold :class="$style.label">
						{{ i18n.baseText('chatHub.agent.editor.systemPrompt.label') }}
						<span :class="$style.required">*</span>
					</N8nText>
					<N8nInput
						v-model="systemPrompt"
						type="textarea"
						:placeholder="i18n.baseText('chatHub.agent.editor.systemPrompt.placeholder')"
						:rows="6"
						:class="$style.input"
					/>
				</div>

				<div :class="$style.field">
					<N8nText tag="label" size="small" bold :class="$style.label">
						{{ i18n.baseText('chatHub.agent.editor.model.label') }}
						<span :class="$style.required">*</span>
					</N8nText>
					<ModelSelector
						:models="chatStore.models ?? null"
						:selected-model="selectedModel"
						:include-custom-agents="false"
						:credentials="agentMergedCredentials"
						@change="onModelChange"
						@select-credential="onCredentialSelected"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<div :class="$style.footerRight">
					<N8nButton
						v-if="isEditMode"
						type="secondary"
						icon="trash-2"
						:disabled="isDeleting"
						:loading="isDeleting"
						@click="onDelete"
					/>
					<N8nButton type="primary" :disabled="!isValid || isSaving" @click="onSave">
						{{ saveButtonLabel }}
					</N8nButton>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.title {
	font-size: var(--font-size--lg);
	line-height: var(--line-height--md);
	margin: 0;
}

.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.label {
	display: block;
}

.required {
	color: var(--color--primary);
}

.input {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	width: 100%;
}

.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
