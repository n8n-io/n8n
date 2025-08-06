<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import type { IconSize, IconColor } from '@n8n/design-system/types/icon';

import type { IconName } from './icons';
import { deprecatedIconSet, updatedIconSet } from './icons';

interface IconProps {
	// component supports both deprecated and updated icon set to support project icons
	// but only allow new icon names to be used in the future
	icon: IconName;
	size?: IconSize | number;
	spin?: boolean;
	color?: IconColor;
	strokeWidth?: number | undefined;
}

defineOptions({ name: 'N8nIcon' });

const props = withDefaults(defineProps<IconProps>(), {
	spin: false,
	size: undefined,
	color: undefined,
});

const $style = useCssModule();
const classes = computed(() => {
	const applied: string[] = [];
	if (props.spin) {
		applied.push('spin');
	}

	if (props.strokeWidth) {
		applied.push('strokeWidth');
	}

	return ['n8n-icon', ...applied.map((c) => $style[c])];
});

const sizesInPixels: Record<IconSize, number> = {
	xsmall: 10,
	small: 12,
	medium: 14,
	large: 16,
	xlarge: 20,
};

const size = computed((): { height: string; width: string } => {
	let sizeToApply = '1em';
	if (props.size) {
		sizeToApply = `${typeof props.size === 'number' ? props.size : sizesInPixels[props.size]}px`;
	}

	return {
		height: sizeToApply,
		width: sizeToApply,
	};
});

const styles = computed(() => {
	const stylesToApply: Record<string, string> = {};

	if (props.color) {
		stylesToApply.color = `var(--color-${props.color})`;
	}

	if (props.strokeWidth) {
		stylesToApply['--n8n-icon-stroke-width'] = `${props.strokeWidth}px`;
	}

	return stylesToApply;
});
</script>

<template>
	<Component
		:is="
			updatedIconSet[icon as keyof typeof updatedIconSet] ??
			deprecatedIconSet[icon as keyof typeof deprecatedIconSet]
		"
		v-if="
			updatedIconSet[icon as keyof typeof updatedIconSet] ??
			deprecatedIconSet[icon as keyof typeof deprecatedIconSet]
		"
		:class="classes"
		aria-hidden="true"
		focusable="false"
		role="img"
		:height="size.height"
		:width="size.width"
		:data-icon="props.icon"
		:style="styles"
	/>
</template>

<style lang="scss" module>
.strokeWidth {
	rect,
	path {
		stroke-width: var(--n8n-icon-stroke-width);
	}
}

.spin {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
