<script lang="ts" setup>
import { computed, ref, watch, useCssModule } from 'vue';

import type { IconName } from './icons';
import { deprecatedIconSet, updatedIconSet } from './icons';
import type { IconSize, IconColor } from '../../types/icon';

interface IconProps {
	// component supports both deprecated and updated icon set to support project icons
	// as well as any Lucide icon name (rendered via fallback SVG)
	icon: IconName | (string & {});
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

// Resolved component from the icon registries
const resolvedComponent = computed(
	() =>
		updatedIconSet[props.icon as keyof typeof updatedIconSet] ??
		deprecatedIconSet[props.icon as keyof typeof deprecatedIconSet] ??
		null,
);

// Fallback: dynamically load Lucide icon SVG body for icons not in the registry
const fallbackBody = ref<string | null>(null);

watch(
	() => props.icon,
	async (iconName) => {
		if (resolvedComponent.value) {
			fallbackBody.value = null;
			return;
		}
		try {
			const { lucideIcons } = await import('../N8nIconPicker/lucideIconData');
			fallbackBody.value = lucideIcons[iconName]?.body ?? null;
		} catch {
			fallbackBody.value = null;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<!-- Primary: existing compiled icon component -->
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
	<!-- eslint-disable vue/no-v-html -- SVG body from trusted generated data -->
	<!-- Fallback: raw SVG from Lucide data (lazy-loaded) -->
	<svg
		v-else-if="fallbackBody"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		:class="classes"
		:height="size.height"
		:width="size.width"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
		role="img"
		:data-icon="props.icon"
		:style="styles"
		v-html="fallbackBody"
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
