<script lang="ts" setup>
import type { IconSize } from '@n8n/design-system/types';

import N8nIcon from '../N8nIcon';

interface ExternalLinkProps {
	href?: string;
	size?: IconSize;
	newWindow?: boolean;
}

defineOptions({ name: 'N8nExternalLink' });
withDefaults(defineProps<ExternalLinkProps>(), {
	href: undefined,
	size: undefined,
	newWindow: true,
});
</script>

<template>
	<component
		:is="href ? 'a' : 'button'"
		:href="href"
		:target="href && newWindow ? '_blank' : undefined"
		:rel="href && newWindow ? 'noopener noreferrer' : undefined"
		:class="$style.link"
		v-bind="$attrs"
	>
		<slot></slot>
		<N8nIcon icon="external-link" :size="size" />
	</component>
</template>

<style lang="scss" module>
.link {
	color: var(--color-text-base);
	text-decoration: none;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-4xs);
	background: none;
	border: none;
	padding: var(--spacing-4xs) var(--spacing-2xs);
	cursor: pointer;
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-regular);

	svg {
		color: var(--color-text-light);
	}

	&:hover {
		color: var(--color-primary);
		background: var(--color-foreground-light);

		svg {
			color: var(--color-primary);
		}
	}

	&:active {
		color: var(--color-primary-shade-1);
	}
}
</style>
