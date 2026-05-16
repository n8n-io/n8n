<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE } from '../constants';

export type AgentEpisodicMemoryCredentialModalData = {
	initialValue: string | null;
	onSelect: (credentialId: string) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentEpisodicMemoryCredentialModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const selectedCredentialId = ref<string | null>(props.data.initialValue);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onCredentialSelect(credentialId: string) {
	selectedCredentialId.value = credentialId;
}

function onCredentialDeselect() {
	selectedCredentialId.value = null;
}

function onConfirm() {
	if (!selectedCredentialId.value) return;

	props.data.onSelect(selectedCredentialId.value);
	closeModal();
}
</script>

<template>
	<Modal
		:name="props.modalName"
		width="460px"
		:center="true"
		min-height="250px"
		data-testid="agent-episodic-memory-credential-modal"
	>
		<template #header>
			<div :class="$style.header">
				<CredentialIcon
					:credential-type-name="AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE"
					:size="24"
					:class="$style.icon"
				/>
				<N8nHeading size="medium" tag="h2">
					{{ i18n.baseText('agents.builder.episodicMemoryCredentialModal.title') }}
				</N8nHeading>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('agents.builder.episodicMemoryCredentialModal.description') }}
				</N8nText>

				<CredentialPicker
					:class="$style.credentialPicker"
					app-name="OpenAI"
					:credential-type="AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE"
					:selected-credential-id="selectedCredentialId"
					:show-delete="false"
					data-testid="agent-episodic-memory-credential-picker"
					@credential-selected="onCredentialSelect"
					@credential-deselected="onCredentialDeselect"
				/>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" :disabled="!selectedCredentialId" @click="onConfirm">
					{{ i18n.baseText('agents.builder.episodicMemoryCredentialModal.confirm') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module>
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

.credentialPicker {
	width: 100%;
}
</style>
