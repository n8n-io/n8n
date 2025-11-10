<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nButton, N8nFormInput, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { type ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

const props = defineProps<{
	provider: ChatHubLLMProvider;
	initialValue: string | null;
}>();

const emit = defineEmits<{
	select: [provider: ChatHubLLMProvider, credentialId: string];
}>();

const modalBus = ref(createEventBus());
const modelId = ref<string | null>(props.initialValue);

const inputRef = ref<InstanceType<typeof N8nFormInput> | null>(null);

onMounted(() => {
	// With modals normal focusing via `props.focus-initially` on N8nFormInput does not work
	setTimeout(() => {
		inputRef.value?.inputRef?.select();
		inputRef.value?.inputRef?.focus();
	});
});

function onConfirm() {
	if (modelId.value) {
		emit('select', props.provider, modelId.value);
		modalBus.value.emit('close');
	}
}

function onCancel() {
	modalBus.value.emit('close');
}
</script>

<template>
	<Modal
		name="chatModelByIdSelectorModal"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[provider]"
					:size="24"
					:class="$style.icon"
				/>
				<h2 :class="$style.title">Choose {{ providerDisplayNames[provider] }} Model By ID</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-base"> Enter the identifier of the modal </N8nText>
				<N8nFormInput
					ref="inputRef"
					v-model="modelId"
					name="model"
					label=""
					max-length="64"
					focus-initially
					@enter="onConfirm"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="tertiary" @click="onCancel">Cancel</N8nButton>
				<N8nButton type="primary" :disabled="!modelId" @click="onConfirm">Select</N8nButton>
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

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}
</style>
