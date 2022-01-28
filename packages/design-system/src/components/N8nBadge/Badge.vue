<template functional>
	<span
		:class="$style[props.theme]"
	>
		<component :is="$options.components.N8nText" :size="props.size" :bold="props.bold" :compact="true">
			<slot></slot>
		</component>
	</span>
</template>

<script lang="ts">
import N8nText from '../N8nText';

export default {
	props: {
		theme: {
			type: String,
			default: 'default',
			validator: (value: string) => ['default', 'secondary'].includes(value),
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
};
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

.secondary {
	composes: badge;
	border-radius: var(--border-radius-xlarge);
	color: var(--color-secondary);
	background-color: var(--color-secondary-tint-1);
}
</style>
