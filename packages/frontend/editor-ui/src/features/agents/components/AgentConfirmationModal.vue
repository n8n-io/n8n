<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import AgentModal from './modals/AgentModal.vue';

export type AgentConfirmationModalData = {
	title: string;
	description: string;
	confirmButtonText: string;
	cancelButtonText: string;
	/** Listed under the description. With `onItemClick`, each one is a link that closes the modal. */
	items?: Array<{ id: string; label: string }>;
	onItemClick?: (id: string) => void;
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

async function onItemClick(id: string) {
	await props.data.onClose?.();
	closeModal();
	props.data.onItemClick?.(id);
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
		<ul v-if="props.data.items?.length" :class="$style.items">
			<li v-for="item in props.data.items" :key="item.id">
				<N8nLink
					v-if="props.data.onItemClick"
					:data-testid="`agent-confirmation-modal-item-${item.id}`"
					@click="onItemClick(item.id)"
				>
					{{ item.label }}
				</N8nLink>
				<N8nText v-else size="medium">{{ item.label }}</N8nText>
			</li>
		</ul>
		<template #footerActions>
			<N8nButton variant="subtle" size="medium" :disabled="submitting" @click="onCancel">
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
	align-items: center;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
}

.items {
	margin: var(--spacing--xs) 0 0;
	padding-left: var(--spacing--xl);
	list-style: disc;
}
</style>
