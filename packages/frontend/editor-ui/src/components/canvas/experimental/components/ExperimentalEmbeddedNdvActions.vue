<script setup lang="ts">
import CanvasNodeStatusIcons from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeStatusIcons.vue';
import { N8nIconButton } from '@n8n/design-system';

defineProps<{ isExpanded: boolean }>();

const emit = defineEmits<{ openNdv: []; toggleExpand: [] }>();
</script>

<template>
	<div :class="$style.actions">
		<div :class="$style.icon">
			<CanvasNodeStatusIcons size="small" spinner-scrim />
		</div>
		<N8nIconButton
			icon="maximize-2"
			type="secondary"
			text
			size="mini"
			icon-size="small"
			aria-label="Open..."
			@click.stop="emit('openNdv')"
		/>
		<N8nIconButton
			:icon="isExpanded ? 'chevron-down' : 'chevron-up'"
			type="secondary"
			text
			size="mini"
			icon-size="medium"
			aria-label="Toggle expand"
			@click.stop="emit('toggleExpand')"
		/>
	</div>
</template>

<style lang="scss" module>
.actions {
	display: flex;
	align-items: center;
	color: var(--color-text-base);

	& > button {
		color: var(--color-text-light);
	}
}

.icon {
	margin-inline: var(--spacing-2xs);
}
</style>
