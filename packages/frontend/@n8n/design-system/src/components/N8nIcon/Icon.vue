<script lang="ts" setup>
import { computed, shallowRef, useCssModule, watch } from 'vue';

import { deprecatedIconSet, updatedIconSet } from './icons';
import type { IconName, NodeIconName } from './icons';
import type { nodeIconSet as NodeIconSetType } from './node-icons';
import type { IconSize, IconColor } from '../../types/icon';

interface IconProps {
	// component supports both deprecated and updated icon set to support project icons
	// but only allow new icon names to be used in the future
	icon: IconName | NodeIconName;
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
	xxlarge: 40,
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

// @TODO Tech debt - property value should be updated to match token names (text-shade-2 instead of text-dark for example)
const colorMap: Record<IconColor, string> = {
	primary: '--color--primary',
	secondary: '--color--secondary',
	'text-dark': '--color--text--shade-1',
	'text-base': '--color--text',
	'text-light': '--color--text--tint-1',
	'text-xlight': '--color--text--tint-2',
	danger: '--color--danger',
	success: '--color--success',
	warning: '--color--warning',
	'foreground-dark': '--color--foreground--shade-1',
	'foreground-xdark': '--color--foreground--shade-2',
};

const styles = computed(() => {
	const stylesToApply: Record<string, string> = {};

	if (props.color) {
		stylesToApply.color = `var(${colorMap[props.color]})`;
	}

	if (props.strokeWidth) {
		stylesToApply['--icon--stroke-width'] = `${props.strokeWidth}px`;
	}

	return stylesToApply;
});

const nodeIconSetRef = shallowRef<typeof NodeIconSetType | null>(null);

watch(
	() => props.icon,
	async (icon) => {
		if (typeof icon === 'string' && icon.startsWith('node:') && !nodeIconSetRef.value) {
			const { nodeIconSet } = await import('./node-icons');
			nodeIconSetRef.value = nodeIconSet;
		}
	},
	{ immediate: true },
);

const resolvedComponent = computed(
	() =>
		nodeIconSetRef.value?.[props.icon as keyof typeof NodeIconSetType] ??
		updatedIconSet[props.icon as keyof typeof updatedIconSet] ??
		deprecatedIconSet[props.icon as keyof typeof deprecatedIconSet],
);
</script>

<template>
	<Component
		:is="resolvedComponent"
		v-if="resolvedComponent"
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
		stroke-width: var(--icon--stroke-width);
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
