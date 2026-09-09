<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';

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

const name = ref('');
const submitting = ref(false);

const trimmedName = computed(() => name.value.trim());

const isNameTaken = computed(
	() => trimmedName.value.length > 0 && props.data.existingNames.includes(trimmedName.value),
);

const canConfirm = computed(
	() => trimmedName.value.length > 0 && !isNameTaken.value && !submitting.value,
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
	<Modal
		:name="modalName"
		width="420px"
		data-testid="agent-duplicate-modal"
		:close-on-click-modal="!submitting"
		:close-on-press-escape="!submitting"
		:show-close="!submitting"
	>
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ i18n.baseText('agents.duplicate.modal.name') }}
			</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInput
					v-model="name"
					:placeholder="i18n.baseText('agents.duplicate.modal.enterName')"
					:label="i18n.baseText('agents.duplicate.modal.enterName')"
					:required="true"
					data-testid="agent-duplicate-name-input"
					@enter="onConfirm"
				/>
				<N8nText v-if="isNameTaken" :class="$style.error" size="small">
					{{ i18n.baseText('agents.duplicate.modal.button.nameTaken') }}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" :disabled="submitting" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:disabled="!canConfirm"
					:loading="submitting"
					data-testid="agent-duplicate-confirm"
					@click="onConfirm"
				>
					{{ i18n.baseText('agents.duplicate.modal.button.confirm') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
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

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
