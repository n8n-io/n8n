<script lang="ts" setup>
import { computed, ref, shallowRef, useCssModule, watch } from 'vue';

import { resolveIconColor } from './iconColor';
import { deprecatedIconSet, updatedIconSet } from './icons';
import type { IconName, NodeIconName } from './icons';
import type { nodeIconSet as NodeIconSetType } from './node-icons';
import { vSvgContent } from './svgContentDirective';
import { useInjectIconBodyLoader } from '../../composables/useIconBodyLoader';
import type { IconSize, IconColor } from '../../types/icon';

interface IconProps {
	// component supports both deprecated and updated icon set to support project icons,
	// node icons (lazy-loaded via `node:` prefix), and any Lucide icon name (rendered via fallback SVG)
	icon: IconName | NodeIconName | (string & {});
	size?: IconSize | number;
	spin?: boolean;
	// accepts a named IconColor token or a raw CSS custom property (e.g. '--node--icon--color--blue')
	color?: IconColor | (string & {});
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

const styles = computed(() => {
	const stylesToApply: Record<string, string> = {};

	const color = resolveIconColor(props.color);
	if (color) {
		stylesToApply.color = color;
	}

	if (props.strokeWidth) {
		stylesToApply['--icon--stroke-width'] = `${props.strokeWidth}px`;
	}

	return stylesToApply;
});

const nodeIconSetRef = shallowRef<typeof NodeIconSetType | null>(null);

// Lucide icons in the eager sets are bundled SVG body strings; custom and node
// icons are components. Both render synchronously (no async fallback needed).
const resolvedIcon = computed(
	() =>
		nodeIconSetRef.value?.[props.icon as keyof typeof NodeIconSetType] ??
		updatedIconSet[props.icon as keyof typeof updatedIconSet] ??
		deprecatedIconSet[props.icon as keyof typeof deprecatedIconSet] ??
		null,
);

const resolvedComponent = computed(() =>
	typeof resolvedIcon.value === 'string' ? null : resolvedIcon.value,
);
const eagerBody = computed(() =>
	typeof resolvedIcon.value === 'string' ? resolvedIcon.value : null,
);

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

const loadIconBody = useInjectIconBodyLoader();

const fallbackBody = ref<string | null>(null);
let fallbackRequestId = 0;

watch(
	() => [props.icon, resolvedIcon.value] as const,
	async ([iconName, resolved]) => {
		const requestId = ++fallbackRequestId;
		if (resolved !== null) {
			fallbackBody.value = null;
			return;
		}

		try {
			const body = await loadIconBody(iconName);
			if (requestId === fallbackRequestId) {
				fallbackBody.value = body;
			}
		} catch {
			if (requestId === fallbackRequestId) {
				fallbackBody.value = null;
			}
		}
	},
	{ immediate: true },
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
	/><svg
		v-else-if="eagerBody"
		v-svg-content="eagerBody"
		viewBox="0 0 24 24"
		:class="classes"
		:width="size.width"
		:height="size.height"
		aria-hidden="true"
		focusable="false"
		role="img"
		:data-icon="props.icon"
		:style="styles"
	/><svg
		v-else-if="fallbackBody"
		v-svg-content="fallbackBody"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		:class="[...classes, $style.fallbackIcon]"
		:height="size.height"
		:width="size.width"
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
		role="img"
		:data-icon="props.icon"
		:style="styles"
	/>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.fallbackIcon {
	stroke-width: 1.5;
}

.strokeWidth {
	rect,
	path {
		stroke-width: var(--icon--stroke-width);
	}
}

.spin {
	@include motion.spin;
}
</style>
