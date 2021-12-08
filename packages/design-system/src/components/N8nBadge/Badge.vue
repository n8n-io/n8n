<template functional>
	<span
		:class="$style[props.theme]"
	>
		<component :is="$options.components.N8nText" :size="props.size" :bold="props.bold">
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
			default: 'info',
			validator: (value: string) => ['info', 'danger', 'warning'].includes(value),
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
@function lightness($h, $s, $l, $lightness) {
	@return hsl(var(#{$h}), var(#{$s}), calc(var(#{$l}) + #{$lightness}));
}

$color-warning-shade: lightness(
	--color-warning-h,
	--color-warning-s,
	--color-warning-tint-1-l,
	-30%
);

.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-5xs) var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	white-space: nowrap;
	font-weight: var(--font-weight-bold);
}

.danger {
  composes: badge;
  color: var(--color-danger);
  background-color: var(--color-danger-tint-2);
  border-color: var(--color-danger-tint-1);
}

.warning {
  composes: badge;
  background-color: var(--color-warning-tint-1);
	color: $color-warning-shade;
	border-color: transparent;
}

.info {
	composes: badge;
	color: var(--color-text-light);
	border-color: var(--color-text-light);
}
</style>
