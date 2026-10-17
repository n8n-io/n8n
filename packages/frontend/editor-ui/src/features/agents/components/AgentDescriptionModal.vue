<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { AGENT_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

export type AgentDescriptionModalData = {
	agentName: string;
	description: string;
	onConfirm: (description: string) => void;
};

const props = defineProps<{
	modalName: string;
	data: AgentDescriptionModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const description = ref(props.data.description);
const canSave = computed(() => description.value.trim() !== props.data.description);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

function onSave() {
	props.data.onConfirm(description.value.trim());
	closeModal();
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="data.agentName || i18n.baseText('generic.description')"
		size="medium"
		data-testid="agent-description-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<N8nInput
				v-model="description"
				type="textarea"
				:rows="6"
				:maxlength="AGENT_DESCRIPTION_MAX_LENGTH"
				autofocus
				:placeholder="i18n.baseText('agents.builder.description.placeholder')"
				data-testid="agent-description-input"
			/>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.description.tip') }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="!canSave"
				data-testid="agent-description-save"
				@click="onSave"
			>
				{{ i18n.baseText('generic.save') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
