<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	// The shared removal flow passes this on. WhatsApp has no external resource to delete.
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		stacked
		:show-close-button="!loading"
		@update:open="(value) => !value && !loading && emit('cancel')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('agents.channels.whatsapp.remove.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<div :class="$style.content">
			<N8nDialogDescription as-child>
				<N8nText size="medium" color="text-light">
					{{ i18n.baseText('agents.channels.whatsapp.remove.description') }}
				</N8nText>
			</N8nDialogDescription>
		</div>
		<N8nDialogFooter>
			<div :class="$style.actions">
				<N8nButton variant="outline" :disabled="loading" @click="emit('cancel')">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="destructive"
					:loading="loading"
					data-testid="whatsapp-remove-confirm"
					@click="emit('confirm', false)"
				>
					{{ i18n.baseText('agents.channels.whatsapp.remove.confirm') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.content {
	margin-top: var(--spacing--md);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
