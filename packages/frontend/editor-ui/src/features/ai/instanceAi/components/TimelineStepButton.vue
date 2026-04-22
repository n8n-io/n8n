<script lang="ts" setup>
/**
 * TimelineStepButton — full-width ghost button used as a collapsible trigger
 * in timeline components (ToolCallStep, AgentSection). Renders an icon slot
 * and truncated text label.
 */
import { N8nButton } from '@n8n/design-system';
import { useElementHover } from '@vueuse/core';
import { useTemplateRef } from 'vue';

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
	}>(),
	{
		size: 'small',
	},
);

defineSlots<{
	icon?: (props: { isHovered: boolean }) => unknown;
	default?: () => unknown;
}>();

const triggerRef = useTemplateRef<HTMLElement>('triggerRef');
const isHovered = useElementHover(triggerRef);

defineExpose({ isHovered });
</script>

<template>
	<N8nButton ref="triggerRef" variant="ghost" :size="size" :class="$style.block">
		<template #icon>
			<slot name="icon" :is-hovered="isHovered" />
		</template>
		<span :class="$style.ellipsis">
			<slot />
		</span>
	</N8nButton>
</template>

<style lang="scss" module>
.block {
	max-width: 90%;
	justify-content: flex-start;
	color: var(--color--text--tint-1);
	position: relative;

	:global(.n8n-icon) {
		flex-shrink: 0;
	}

	> *:first-child {
		max-width: 100%;
		overflow: hidden;
	}
}

.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: normal;
}
</style>
