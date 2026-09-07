<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';

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

async function onBeforeClose() {
	const shouldClose = await props.data.onClose?.();
	return shouldClose !== false;
}
</script>

<template>
	<Modal width="500px" :name="props.modalName" :before-close="onBeforeClose">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ props.data.title }}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<N8nText size="medium">
					{{ props.data.description }}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" size="medium" :disabled="submitting" @click="onCancel">
					{{ props.data.cancelButtonText }}
				</N8nButton>
				<N8nButton variant="solid" size="medium" :loading="submitting" @click="onConfirm">
					{{ props.data.confirmButtonText }}
				</N8nButton>
			</div>
		</template>
	</Modal>
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

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
