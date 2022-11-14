<template>
	<span :class="['n8n-badge', $style[theme]]">
		<n8n-text :size="size" :bold="bold" :compact="true">
			<slot></slot>
		</n8n-text>
	</span>
</template>

<script lang="ts">
import N8nText from '../N8nText';

import Vue from 'vue';

export default Vue.extend({
	props: {
		theme: {
			type: String,
			default: 'default',
			validator: (value: string) => ['default', 'primary', 'secondary', 'tertiary'].includes(value),
		},
		size: {
			type: String,
			default: 'small',
		},
		bold: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		N8nText,
	},
});
</script>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing-5xs) var(--spacing-4xs);
	border: var(--border-base);
	white-space: nowrap;
}

.default {
	composes: badge;
	border-radius: var(--border-radius-base);
	color: var(--color-text-light);
	border-color: var(--color-text-light);
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
	padding: 1px var(--spacing-4xs);
}
</style>
