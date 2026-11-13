<script setup lang="ts">
import { N8nButton, N8nDialogDescription, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentModal from '../components/modals/AgentModal.vue';

const props = defineProps<{
	open: boolean;
	loading: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	confirmTestId: string;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [];
}>();

defineSlots<{
	/** Extra choices about the removal, below the description. */
	default?: () => unknown;
}>();

const i18n = useI18n();

function onOpenChange(open: boolean) {
	if (!open && !props.loading) emit('cancel');
}
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="loading"
		:show-cancel="false"
		size="large"
		stacked
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<div :class="$style.message">
				<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<N8nDialogDescription as-child>
					<N8nText size="medium" :class="$style.description">{{ description }}</N8nText>
				</N8nDialogDescription>
			</div>
			<slot />
		</div>
		<template #footerActions>
			<N8nButton variant="outline" size="medium" :disabled="loading" @click="emit('cancel')">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				variant="destructive"
				size="medium"
				:loading="loading"
				:data-testid="confirmTestId"
				@click="emit('confirm')"
			>
				{{ confirmLabel }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.message {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
}

// The dialog description adds a bottom margin, which pulls the centered icon below the text.
.message .description {
	margin: 0;
}
</style>
