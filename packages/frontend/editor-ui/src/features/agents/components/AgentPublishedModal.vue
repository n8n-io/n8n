<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useStorage } from '@n8n/composables/useStorage';
import { useUIStore } from '@/app/stores/ui.store';
import { LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION } from '../constants';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import AgentModal from './modals/AgentModal.vue';

export type AgentPublishedModalData = {
	agentId: string;
};

const props = defineProps<{
	modalName: string;
	data: AgentPublishedModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const { trackDismissedAgentPublishedModal } = useAgentTelemetry();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const checked = ref(false);

function handleCheckboxChange(checkboxValue: string | number | boolean) {
	const boolValue = typeof checkboxValue === 'boolean' ? checkboxValue : Boolean(checkboxValue);
	checked.value = boolValue;
	useStorage(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION).value = boolValue.toString();
}

function onOpenChange(open: boolean) {
	if (open) return;
	trackDismissedAgentPublishedModal({
		agentId: props.data.agentId,
		dontShowAgain: checked.value,
	});
	uiStore.closeModal(props.modalName);
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.publish.modal.title')"
		:show-cancel="false"
		size="large"
		data-testid="agent-published-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<N8nText>{{ i18n.baseText('agents.publish.modal.description.readyToUse') }}</N8nText>
			<N8nText>
				{{ i18n.baseText('agents.publish.modal.description.changesNotPublished') }}
			</N8nText>
		</div>
		<template #footerLeft>
			<N8nCheckbox
				:model-value="checked"
				data-testid="agent-published-modal-dont-show-again"
				@update:model-value="handleCheckboxChange"
			>
				<template #label>{{ i18n.baseText('generic.dontShowAgain') }}</template>
			</N8nCheckbox>
		</template>
		<template #footerActions>
			<N8nButton
				variant="solid"
				data-testid="agent-published-modal-got-it"
				@click="onOpenChange(false)"
			>
				{{ i18n.baseText('agents.publish.modal.gotIt') }}
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
