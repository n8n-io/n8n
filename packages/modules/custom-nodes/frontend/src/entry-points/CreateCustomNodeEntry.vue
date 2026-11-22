<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/**
 * "Create custom node" in the nodes panel: the last item of the node list, or a highlighted
 * box in the no-results state of a search. The editor opens the wizard on `select`.
 */
withDefaults(defineProps<{ highlighted?: boolean }>(), { highlighted: false });

const emit = defineEmits<{ select: [] }>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="[$style.entry, { [$style.highlighted]: highlighted }]"
		:data-highlighted="highlighted || undefined"
		data-test-id="custom-node-create-entry"
	>
		<N8nIcon icon="blocks" :size="highlighted ? 'xlarge' : 'large'" :class="$style.icon" />
		<div :class="$style.text">
			<N8nText bold size="small">
				{{ i18n.baseText('customNodes.entry.createNode.title') }}
			</N8nText>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('customNodes.entry.createNode.description') }}
			</N8nText>
		</div>
		<N8nButton
			:variant="highlighted ? 'solid' : 'outline'"
			size="small"
			data-test-id="custom-node-create-button"
			data-attr="custom-node-create-button"
			@click="emit('select')"
		>
			<template #icon><N8nIcon icon="plus" /></template>
			{{ i18n.baseText('customNodes.entry.createNode.button') }}
		</N8nButton>
	</div>
</template>

<style lang="scss" module>
.entry {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
}

.highlighted {
	flex-direction: column;
	text-align: center;
	margin: var(--spacing--md) 0 0;
	padding: var(--spacing--md);
	border-color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}

.icon {
	flex: none;
	color: var(--color--primary);
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}
</style>
