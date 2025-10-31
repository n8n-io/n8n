<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { ChatHubProvider, ChatModelDto } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { assert } from '@n8n/utils/assert';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, ref, watch } from 'vue';
import type { CredentialsMap } from '../chat.types';

const props = defineProps<{
	credentials: CredentialsMap;
	agentId?: string;
}>();

const emit = defineEmits<{
	createCustomAgent: [agent: ChatModelDto];
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
const selectedModel = ref<ChatModelDto | null>(null);
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
	const customAgent = chatStore.currentEditingAgent;

	if (!customAgent) return;

	name.value = customAgent.name;
	description.value = customAgent.description ?? '';
	systemPrompt.value = customAgent.systemPrompt;
	selectedModel.value = chatStore.getAgent(customAgent) ?? null;

	if (customAgent.credentialId) {
		agentSelectedCredentials.value[customAgent.provider] = customAgent.credentialId;
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
	() => uiStore.modalsById.agentEditor?.open,
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

function onModelChange(model: ChatModelDto) {
	selectedModel.value = model;
}

async function onSave() {
	if (!isValid.value || isSaving.value) return;

	isSaving.value = true;
	try {
		assert(selectedModel.value);

		const model = 'model' in selectedModel.value ? selectedModel.value.model : undefined;

		assert(model);
		assert(model.provider !== 'n8n' && model.provider !== 'custom-agent');

		const credentialId = agentMergedCredentials.value[model.provider];

		assert(credentialId);

		const payload = {
			name: name.value.trim(),
			description: description.value.trim() || undefined,
			systemPrompt: systemPrompt.value.trim(),
			...model,
			credentialId,
		};

		if (isEditMode.value && props.agentId) {
			await chatStore.updateCustomAgent(props.agentId, payload, props.credentials);
			toast.showMessage({
				title: i18n.baseText('chatHub.agent.editor.success.update'),
				type: 'success',
			});
		} else {
			const agent = await chatStore.createCustomAgent(payload, props.credentials);
			emit('createCustomAgent', agent);

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
		await chatStore.deleteCustomAgent(props.agentId, props.credentials);
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
			<N8nHeading tag="h2" size="large">{{ title }}</N8nHeading>
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

				<N8nInputLabel
					input-name="agent-model"
					:label="i18n.baseText('chatHub.agent.editor.model.label')"
					:required="true"
				>
					<ModelSelector
						:selectedAgent="selectedModel"
						:include-custom-agents="false"
						:credentials="agentMergedCredentials"
						@change="onModelChange"
						@select-credential="onCredentialSelected"
					/>
				</N8nInputLabel>
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
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
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
