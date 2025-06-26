<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import type { IconSize, IconColor } from '@n8n/design-system/types/icon';

import type { IconName } from './icons';
import { allIcons } from './icons';

interface IconProps {
	icon: IconName;
	size?: IconSize | number;
	spin?: boolean;
	color?: IconColor;
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

	return applied.map((c) => $style[c]);
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

	return stylesToApply;
});
</script>

<template>
	<Component
		:is="allIcons[icon as keyof typeof allIcons]"
		v-if="allIcons[icon as keyof typeof allIcons]"
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

<style>
.n8n-icon {
	display: inline-flex;
	justify-content: center;
	align-items: center;
}
</style>

<style lang="scss" module>
.spin {
	animation: spin 1s linear infinite;
}

.primary {
	color: var(--color-primary);
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
