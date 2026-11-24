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
	// drawn instead when `icon` is in no icon set
	fallbackIcon?: IconName;
}

defineOptions({ name: 'N8nIcon' });

const props = withDefaults(defineProps<IconProps>(), {
	spin: false,
	size: undefined,
	color: undefined,
	fallbackIcon: undefined,
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

const findComponent = (name: string) =>
	nodeIconSetRef.value?.[name as keyof typeof NodeIconSetType] ??
	updatedIconSet[name as keyof typeof updatedIconSet] ??
	deprecatedIconSet[name as keyof typeof deprecatedIconSet] ??
	null;

// The name the loader found nothing for. Cleared when `icon` changes, so a name selected again loads again.
const missingIcon = ref<string | null>(null);
// A node icon can arrive after the loader replied, so the requested icon always wins.
const displayedIcon = computed(() =>
	props.fallbackIcon && missingIcon.value === props.icon && !findComponent(props.icon)
		? props.fallbackIcon
		: props.icon,
);

const resolvedComponent = computed(() => findComponent(displayedIcon.value));

watch(
	() => props.icon,
	async (icon) => {
		missingIcon.value = null;
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
	() => [displayedIcon.value, resolvedComponent.value] as const,
	async ([iconName, resolvedIcon]) => {
		const requestId = ++fallbackRequestId;
		if (resolvedIcon) {
			fallbackBody.value = null;
			return;
		}

		let body: string | null = null;
		try {
			body = await loadIconBody(iconName);
		} catch {
			// A failed load draws like an unknown name: blank, or the fallback until `icon` changes.
		}
		if (requestId !== fallbackRequestId) return;
		fallbackBody.value = body;
		// Only the requested name switches to the fallback; a missing fallback stays blank.
		if (body === null && iconName === props.icon) missingIcon.value = iconName;
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
		:data-icon="displayedIcon"
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
		:data-icon="displayedIcon"
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
