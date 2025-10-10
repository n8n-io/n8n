<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import Modal from '@/components/Modal.vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { ICredentialsResponse } from '@/Interface';
import { createEventBus } from '@n8n/utils/event-bus';
import { PROVIDER_CREDENTIAL_TYPE_MAP, type ChatHubProvider } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/chatHub/constants';
import CredentialIcon from '@/components/CredentialIcon.vue';

const props = defineProps<{
	provider: ChatHubProvider;
	initialValue: string | null;
}>();

const emit = defineEmits<{
	select: [provider: ChatHubProvider, credentialId: string];
	createNew: [provider: ChatHubProvider];
}>();

const credentialsStore = useCredentialsStore();
const modalBus = ref(createEventBus());
const selectedCredentialId = ref<string | null>(props.initialValue);

const availableCredentials = computed<ICredentialsResponse[]>(() => {
	return credentialsStore.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[props.provider]);
});

function onCredentialSelect(credentialId: string) {
	selectedCredentialId.value = credentialId;
}

function onConfirm() {
	if (selectedCredentialId.value) {
		emit('select', props.provider, selectedCredentialId.value);
		modalBus.value.emit('close');
	}
}

function onCreateNew() {
	emit('createNew', props.provider);
	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}
</script>

<template>
	<Modal
		name="chatCredentialSelector"
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
				<h2 :class="$style.title">Select {{ providerDisplayNames[provider] }} Credential</h2>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-base">
					Choose an existing credential or create a new one
				</N8nText>
				<N8nSelect
					:model-value="selectedCredentialId"
					size="large"
					placeholder="Select credential..."
					data-test-id="credential-select"
					@update:model-value="onCredentialSelect"
				>
					<N8nOption
						v-for="credential in availableCredentials"
						:key="credential.id"
						:value="credential.id"
						:label="credential.name"
					/>
				</N8nSelect>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" @click="onCreateNew"> Create New </N8nButton>
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel"> Cancel </N8nButton>
					<N8nButton type="primary" :disabled="!selectedCredentialId" @click="onConfirm">
						Select
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

.footerRight {
	display: flex;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}
</style>
