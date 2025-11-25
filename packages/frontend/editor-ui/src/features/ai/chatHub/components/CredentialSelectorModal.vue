<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nHeading, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { createEventBus } from '@n8n/utils/event-bus';
import { type ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		initialValue: string | null;
		onSelect: (provider: ChatHubLLMProvider, credentialId: string) => void;
		onCreateNew: (provider: ChatHubLLMProvider) => void;
	};
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const modalBus = ref(createEventBus());
const selectedCredentialId = ref<string | null>(props.data.initialValue);

const availableCredentials = computed<ICredentialsResponse[]>(() => {
	return credentialsStore.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider]);
});

function onCredentialSelect(credentialId: string) {
	selectedCredentialId.value = credentialId;
}

function onConfirm() {
	if (selectedCredentialId.value) {
		props.data.onSelect(props.data.provider, selectedCredentialId.value);
		modalBus.value.emit('close');
	}
}

function onCreateNew() {
	props.data.onCreateNew(props.data.provider);
	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[data.provider]"
					:size="24"
					:class="$style.icon"
				/>
				<N8nHeading size="medium" tag="h2" :class="$style.title">
					{{
						i18n.baseText('chatHub.credentials.selector.title', {
							interpolate: {
								provider: providerDisplayNames[data.provider],
							},
						})
					}}
				</N8nHeading>
			</div>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-base">
					{{
						i18n.baseText('chatHub.credentials.selector.chooseOrCreate', {
							interpolate: {
								provider: providerDisplayNames[data.provider],
							},
						})
					}}
				</N8nText>
				<N8nSelect
					:model-value="selectedCredentialId"
					size="large"
					placeholder="Select credential..."
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
				<N8nButton type="secondary" @click="onCreateNew">
					{{ i18n.baseText('chatHub.credentials.selector.createNew') }}
				</N8nButton>
				<div :class="$style.footerRight">
					<N8nButton type="tertiary" @click="onCancel">
						{{ i18n.baseText('chatHub.credentials.selector.cancel') }}
					</N8nButton>
					<N8nButton type="primary" :disabled="!selectedCredentialId" @click="onConfirm">
						{{ i18n.baseText('chatHub.credentials.selector.confirm') }}
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
	gap: var(--spacing--2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}
</style>
