<script setup lang="ts">
import { N8nBadge, N8nIcon, N8nTooltip } from '@n8n/design-system';

defineProps<{
	count: number;
	tooltipText: string;
	dataTestId?: string;
}>();

defineEmits<{
	click: [];
}>();
</script>

<template>
	<N8nTooltip placement="top">
		<template #content>
			{{ tooltipText }}
		</template>
		<N8nBadge
			theme="tertiary"
			:class="$style.badge"
			:data-test-id="dataTestId"
			@click.stop.prevent="$emit('click')"
		>
			<span :class="$style.badgeText">
				<N8nIcon icon="link" size="medium" />
				{{ count }}
			</span>
		</N8nBadge>
	</N8nTooltip>
</template>

<style lang="scss" module>
.badge {
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--spacing--4xs);
	border-color: var(--color--foreground);
	color: var(--color--text);
}

.badgeText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	line-height: calc(var(--font-size--sm) + 1px);
}
</style>
