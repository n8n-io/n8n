<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { type ChatHubLLMProvider, PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

const props = defineProps<{
	modalName: string;
	data: {
		provider: ChatHubLLMProvider;
		initialValue: string | null;
		onSelect: (provider: ChatHubLLMProvider, credentialId: string | null) => void;
	};
}>();

const i18n = useI18n();
const telemetry = useTelemetry();

const modalBus = ref(createEventBus());
const selectedCredentialId = ref<string | null>(props.data.initialValue);

const credentialType = computed(() => PROVIDER_CREDENTIAL_TYPE_MAP[props.data.provider]);

function onCredentialSelect(credentialId: string) {
	selectedCredentialId.value = credentialId;
}

function onCredentialDeselect() {
	selectedCredentialId.value = null;
}

function onDeleteCredential(credentialId: string) {
	if (!selectedCredentialId.value || credentialId !== selectedCredentialId.value) {
		return;
	}

	selectedCredentialId.value = null;

	if (credentialId === props.data.initialValue) {
		props.data.onSelect(props.data.provider, null);
	}
}

function onCredentialModalOpened(credentialId?: string) {
	telemetry.track('User opened Credential modal', {
		credential_type: credentialType.value,
		source: 'chat',
		new_credential: !credentialId,
		workflow_id: null,
	});
}

function onConfirm() {
	if (selectedCredentialId.value) {
		props.data.onSelect(props.data.provider, selectedCredentialId.value);
		modalBus.value.emit('close');
	}
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
				<div :class="$style.credentialContainer">
					<CredentialPicker
						:class="$style.credentialPicker"
						:app-name="providerDisplayNames[data.provider]"
						:credential-type="credentialType"
						:selected-credential-id="selectedCredentialId"
						:show-delete="true"
						:hide-create-new="true"
						@credential-selected="onCredentialSelect"
						@credential-deselected="onCredentialDeselect"
						@credential-deleted="onDeleteCredential"
						@credential-modal-opened="onCredentialModalOpened"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="onCancel">
					{{ i18n.baseText('chatHub.credentials.selector.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!selectedCredentialId" @click="onConfirm">
					{{ i18n.baseText('chatHub.credentials.selector.confirm') }}
				</N8nButton>
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
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
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

.credentialContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.credentialPicker {
	width: 100%;
}
</style>
