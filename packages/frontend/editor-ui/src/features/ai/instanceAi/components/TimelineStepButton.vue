<script lang="ts" setup>
/**
 * TimelineStepButton — full-width ghost button used as a collapsible trigger
 * in timeline components (ToolCallStep, AgentSection). Renders an icon slot
 * and truncated text label.
 */
import { N8nButton } from '@n8n/design-system';

withDefaults(
	defineProps<{
		size?: 'small' | 'medium';
		loading?: boolean;
	}>(),
	{
		size: 'small',
	},
);

defineSlots<{
	icon?: () => unknown;
	default?: () => unknown;
}>();
</script>

<template>
	<N8nButton variant="ghost" :size="size" :class="$style.block">
		<span :class="{ [$style.ellipsis]: true, [$style.shimmer]: loading }">
			<slot />
		</span>
		<slot name="icon" />
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

// Shimmer animation for active section headers
.shimmer {
	background: linear-gradient(
		90deg,
		var(--color--text--tint-1) 25%,
		var(--color--text--tint-2) 50%,
		var(--color--text--tint-1) 75%
	);
	background-size: 200% 100%;
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}
</style>
