<script lang="ts" setup>
import { computed } from 'vue';

import N8nIcon from '../../N8nIcon';
import type { IconName } from '../../N8nIcon/icons';

/**
 * One glyph by name. The reference cards draw Heroicons (outline, MIT,
 * tailwindlabs/heroicons); the ones that carry the design — sun, cloud, bolt,
 * the plane, the map pin — are inlined so their stroke weight can follow the
 * card. Everything else resolves to the design-system icon of the same meaning.
 * Unknown names render nothing, so a card never shows a broken icon.
 */
const props = withDefaults(defineProps<{ name?: string; size?: number; strokeWidth?: number }>(), {
	name: undefined,
	size: 16,
	strokeWidth: 2.25,
});

/* Heroicons outline paths, 24×24 */
const HERO: Record<string, string[]> = {
	sun: [
		'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z',
	],
	cloud: [
		'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
	],
	bolt: ['m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z'],
	clock: ['M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
	'map-pin': [
		'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
	],
	video: [
		'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
	],
	check: ['M5.25 12.7033 9.40385 17.37 18.75 6.87'],
	plane: [
		'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5',
	],
	ellipsis: [
		'M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z',
	],
};

/* names a card may use → design-system icon */
const DS: Record<string, IconName> = {
	'partly-cloudy': 'cloud-sun',
	fog: 'cloud-fog',
	drizzle: 'cloud-drizzle',
	rain: 'cloud-rain',
	snow: 'cloud-snow',
	thunder: 'cloud-lightning',
	wind: 'wind',
	'external-link': 'external-link',
	calendar: 'calendar',
	send: 'send',
	refresh: 'refresh-cw',
	play: 'play',
	x: 'x',
	'arrow-right': 'arrow-right',
	'arrow-left': 'arrow-left',
	copy: 'copy',
	mail: 'mail',
	message: 'message-circle',
	bell: 'bell',
	star: 'star',
	download: 'download',
	plus: 'plus',
	'chevron-down': 'chevron-down',
	'chevron-left': 'chevron-left',
	'chevron-right': 'chevron-right',
	users: 'users',
	zap: 'zap',
};

const hero = computed(() => (props.name ? HERO[props.name] : undefined));
const ds = computed(() => (props.name ? DS[props.name] : undefined));
const px = computed(() => `${props.size}px`);
</script>

<template>
	<svg
		v-if="hero"
		:class="$style.glyph"
		:width="size"
		:height="size"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		:stroke-width="strokeWidth"
		aria-hidden="true"
	>
		<path v-for="(d, index) in hero" :key="index" :d="d" />
	</svg>
	<N8nIcon
		v-else-if="ds"
		:icon="ds"
		:class="$style.glyph"
		:style="{ width: px, height: px }"
		aria-hidden="true"
	/>
</template>

<style lang="scss" module>
.glyph {
	flex: none;
	display: block;
}
</style>
