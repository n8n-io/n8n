<script setup lang="ts">
import { N8nIconButton } from '@n8n/design-system';

defineProps<{ isExpanded: boolean }>();

const emit = defineEmits<{ openNdv: []; toggleExpand: [] }>();
</script>

<template>
	<div :class="$style.actions">
		<N8nIconButton
			icon="expand"
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
</style>
