<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

export type AgentConfirmationModalData = {
	title: string;
	description: string;
	confirmButtonText: string;
	cancelButtonText: string;
	onConfirm?: () => unknown | Promise<unknown>;
	onCancel?: () => unknown | Promise<unknown>;
	onClose?: () => unknown | Promise<unknown>;
};

const props = defineProps<{
	modalName: string;
	data: AgentConfirmationModalData;
}>();

const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const submitting = ref(false);

function closeModal() {
	uiStore.closeModal(props.modalName);
}

async function onCancel() {
	await props.data.onCancel?.();
	closeModal();
}

async function onConfirm() {
	submitting.value = true;
	try {
		const shouldClose = await props.data.onConfirm?.();
		if (shouldClose !== false) closeModal();
	} catch {
		// Keep the modal open when the caller handles an async failure.
	} finally {
		submitting.value = false;
	}
}

async function onOpenChange(open: boolean) {
	if (open) return;
	const shouldClose = await props.data.onClose?.();
	if (shouldClose !== false) closeModal();
}
</script>

<template>
	<AgentModal
		:open="modalOpen"
		:title="props.data.title"
		:busy="submitting"
		:show-cancel="false"
		size="large"
		data-testid="agent-confirmation-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
			<N8nText size="medium">
				{{ props.data.description }}
			</N8nText>
		</div>
		<template #footerActions>
			<N8nButton variant="outline" size="medium" :disabled="submitting" @click="onCancel">
				{{ props.data.cancelButtonText }}
			</N8nButton>
			<N8nButton variant="solid" size="medium" :loading="submitting" @click="onConfirm">
				{{ props.data.confirmButtonText }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: row;
	align-items: start;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
}
</style>
