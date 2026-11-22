<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

/**
 * The last row of the actions list of a node that can get custom actions, in the nodes panel and
 * in the Action tab of the node settings. The editor opens the wizard on `select`.
 */
const props = withDefaults(
	defineProps<{
		nodeDisplayName: string;
		/** A custom node gets its own action, not a custom action of a parent node. */
		customNode?: boolean;
	}>(),
	{ customNode: false },
);

const emit = defineEmits<{ select: [] }>();

const i18n = useI18n();

const label = computed(() =>
	i18n.baseText(
		props.customNode ? 'customNodes.entry.addAction.node' : 'customNodes.entry.addAction.parent',
		{ interpolate: { node: props.nodeDisplayName } },
	),
);
</script>

<template>
	<div
		:class="$style.entry"
		role="button"
		tabindex="0"
		data-test-id="custom-action-add-entry"
		data-attr="custom-action-add-entry"
		@click="emit('select')"
		@keydown.enter.prevent="emit('select')"
	>
		<N8nIcon icon="plus" :class="$style.icon" />
		<N8nText size="small" bold color="primary">{{ label }}</N8nText>
	</div>
</template>

<style lang="scss" module>
.entry {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--sm);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background-color: var(--color--background);
	}
}

.icon {
	color: var(--color--primary);
}
</style>
