<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';

type AgentConfirmationModalItem = { id: string; name: string; href: string };

/**
 * Keeps the modal open: the message goes into a callout under the items, and
 * each failed item is marked with a badge whose tooltip shows the reason.
 */
export type AgentConfirmationModalFailure = {
	message: string;
	failedItems: Array<{ id: string; reason: string }>;
};

export type AgentConfirmationModalData = {
	title: string;
	description: string;
	/** Linked resources listed under the description. */
	items?: AgentConfirmationModalItem[];
	confirmButtonText: string;
	cancelButtonText: string;
	/** Resolve with a failure to keep the modal open and show it; the modal closes otherwise. */
	onConfirm?: () => Promise<AgentConfirmationModalFailure | undefined>;
	onCancel?: () => unknown | Promise<unknown>;
	onClose?: () => unknown | Promise<unknown>;
};

const props = defineProps<{
	modalName: string;
	data: AgentConfirmationModalData;
}>();

const uiStore = useUIStore();
const i18n = useI18n();
const submitting = ref(false);
const failure = ref<AgentConfirmationModalFailure | null>(null);

const failureReasons = computed(
	() => new Map(failure.value?.failedItems.map(({ id, reason }) => [id, reason])),
);

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
		failure.value = (await props.data.onConfirm?.()) ?? null;
		if (!failure.value) closeModal();
	} catch {
		// Keep the modal open when the caller handles an async failure.
	} finally {
		submitting.value = false;
	}
}

async function onBeforeClose() {
	// Closing mid-flight would hide a request that still completes.
	if (submitting.value) return false;
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
				<div :class="$style.body">
					<N8nText size="medium" data-test-id="agent-confirmation-description">
						{{ props.data.description }}
					</N8nText>
					<ul
						v-if="props.data.items?.length"
						:class="$style.list"
						data-test-id="agent-confirmation-items"
					>
						<li v-for="item in props.data.items" :key="item.id">
							<N8nLink :to="item.href" new-window size="small">{{ item.name }}</N8nLink>
							<N8nTooltip v-if="failureReasons.has(item.id)" placement="top">
								<template #content>{{ failureReasons.get(item.id) }}</template>
								<N8nBadge
									theme="danger"
									size="xsmall"
									:class="$style.failedBadge"
									data-test-id="agent-confirmation-item-failed"
								>
									{{ i18n.baseText('agents.confirmationModal.item.failed') }}
								</N8nBadge>
							</N8nTooltip>
						</li>
					</ul>
					<N8nCallout
						v-if="failure"
						theme="danger"
						icon="status-error"
						data-test-id="agent-confirmation-failure"
					>
						{{ failure.message }}
					</N8nCallout>
				</div>
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

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.list {
	margin: 0;
	padding-left: var(--spacing--md);
	list-style: disc;
}

.failedBadge {
	margin-left: var(--spacing--2xs);
	vertical-align: middle;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
