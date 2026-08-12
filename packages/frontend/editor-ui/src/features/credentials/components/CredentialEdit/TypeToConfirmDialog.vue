<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		// The exact word the user must type to enable the confirm button (e.g. "delete").
		confirmKeyword: string;
		loading?: boolean;
	}>(),
	{ loading: false },
);

const emit = defineEmits<{
	confirm: [];
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const typed = ref('');

const canConfirm = computed(() => typed.value.trim() === props.confirmKeyword);

// Reset the field each time the dialog re-opens so a previous attempt doesn't
// leave the confirm button enabled.
watch(
	() => props.open,
	(open) => {
		if (open) typed.value = '';
	},
);

function onConfirm(): void {
	if (!canConfirm.value || props.loading) return;
	emit('confirm');
}

function close(): void {
	emit('update:open', false);
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		size="small"
		data-test-id="credential-type-to-confirm-dialog"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.body">
			<N8nText color="text-base">{{ message }}</N8nText>
			<N8nInputLabel
				:label="
					i18n.baseText('credentialEdit.credentialEdit.confirmMessage.typeToConfirm', {
						interpolate: { keyword: confirmKeyword },
					})
				"
			>
				<N8nInput
					v-model="typed"
					data-test-id="credential-type-to-confirm-input"
					@keyup.enter="onConfirm"
				/>
			</N8nInputLabel>
		</div>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="credential-type-to-confirm-cancel"
				@click="close"
			/>
			<N8nButton
				variant="destructive"
				:label="confirmLabel"
				:disabled="!canConfirm"
				:loading="loading"
				data-test-id="credential-type-to-confirm-button"
				@click="onConfirm"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
