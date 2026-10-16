<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

export type AgentDuplicateModalData = {
	projectId: string;
	agentId: string;
	/** Source agent name, used to prefill `<name> (copy)`. */
	name: string;
	existingNames: string[];
	onConfirm: (name: string) => void | Promise<void>;
};

const props = defineProps<{
	modalName: string;
	data: AgentDuplicateModalData;
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const name = ref('');
const submitting = ref(false);
const submitted = ref(false);

const trimmedName = computed(() => name.value.trim());

const isNameTaken = computed(
	() => trimmedName.value.length > 0 && props.data.existingNames.includes(trimmedName.value),
);

const canConfirm = computed(
	() => trimmedName.value.length > 0 && !isNameTaken.value && !submitting.value,
);
const nameError = computed(() => {
	if (!trimmedName.value) {
		return i18n.baseText('agents.duplicate.modal.nameRequired' as BaseTextKey);
	}
	if (isNameTaken.value) return i18n.baseText('agents.duplicate.modal.button.nameTaken');
	return '';
});
const visibleNameError = computed(() =>
	submitted.value || isNameTaken.value ? nameError.value : '',
);

watch(
	() => props.data.agentId,
	() => {
		name.value = `${props.data.name} (copy)`;
	},
	{ immediate: true },
);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function onConfirm() {
	submitted.value = true;
	if (!canConfirm.value) return;
	submitting.value = true;
	try {
		await props.data.onConfirm(trimmedName.value);
		closeModal();
	} catch {
		// Keep the modal open so the caller can surface the error via toast.
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="i18n.baseText('agents.duplicate.modal.name')"
		:busy="submitting"
		size="medium"
		data-testid="agent-duplicate-modal"
		@update:open="!$event && closeModal()"
	>
		<div :class="$style.content">
			<N8nInput
				v-model="name"
				:placeholder="i18n.baseText('agents.duplicate.modal.enterName')"
				:label="i18n.baseText('agents.duplicate.modal.enterName')"
				:required="true"
				data-testid="agent-duplicate-name-input"
				@enter="onConfirm"
			/>
			<N8nText v-if="visibleNameError" :class="$style.error" size="small">
				{{ visibleNameError }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton
				variant="solid"
				:disabled="submitting"
				:loading="submitting"
				data-testid="agent-duplicate-confirm"
				@click="onConfirm"
			>
				{{ i18n.baseText('agents.duplicate.modal.button.confirm') }}
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

.error {
	color: var(--color--danger);
}
</style>
