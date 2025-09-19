<script lang="ts" setup>
import type { TextSize, BadgeTheme } from '@n8n/design-system/types/';

import N8nText from '../N8nText';

interface BadgeProps {
	theme?: BadgeTheme;
	size?: TextSize;
	bold?: boolean;
	showBorder?: boolean;
}

defineOptions({ name: 'N8nBadge' });
withDefaults(defineProps<BadgeProps>(), {
	theme: 'default',
	size: 'small',
	bold: false,
	showBorder: true,
});
</script>

<template>
	<span :class="['n8n-badge', { [$style[theme]]: true, [$style.border]: showBorder }]">
		<N8nText :size="size" :bold="bold" :compact="true">
			<slot></slot>
		</N8nText>
	</span>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing-5xs) var(--spacing-4xs);
	white-space: nowrap;

	&.border {
		border: var(--border-base);
	}
}

.default {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-text-light);
	border-color: var(--color-text-light);
}

.success {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-success);
	border-color: var(--color-success);
}

.warning {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-warning);
	border-color: var(--color-warning);
}

.danger {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-danger);
	border-color: var(--color-danger);
}

.primary {
	composes: badge;
	padding: var(--spacing-5xs) var(--spacing-3xs);
	border-radius: var(--border-radius-xlarge);
	color: var(--color-foreground-xlight);
	background-color: var(--color-primary);
	border-color: var(--color-primary);
}

.secondary {
	composes: badge;
	border-radius: var(--border-radius-xlarge);
	color: var(--color-secondary);
	background-color: var(--color-secondary-tint-1);
}

.tertiary {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-text-light);
	border-color: var(--color-text-light);
	padding: 1px var(--spacing-5xs);
}
</style>
