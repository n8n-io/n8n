<script lang="ts" setup>
import { computed, inject, ref } from 'vue';

import { RC_ICON_SWAP_STATE } from './iconSwapContext';

const props = defineProps<{ name: string }>();

const state = inject(RC_ICON_SWAP_STATE, ref(''));
const active = computed(() => state.value === props.name);
</script>

<template>
	<span :class="[$style.icon, { [$style.active]: active }]" :data-key="name" aria-hidden="true">
		<slot />
	</span>
</template>

<style lang="scss" module>
.icon {
	grid-area: 1 / 1;
	position: relative;
	display: grid;
	place-items: center;
	opacity: 0;
	filter: blur(var(--rc-icon-swap-blur, 2px));
	transform: scale(var(--rc-icon-swap-start-scale, 0.25));
	transition:
		opacity var(--rc-icon-swap-dur, 250ms) var(--rc-icon-swap-ease, ease-in-out),
		filter var(--rc-icon-swap-dur, 250ms) var(--rc-icon-swap-ease, ease-in-out),
		transform var(--rc-icon-swap-dur, 250ms) var(--rc-icon-swap-ease, ease-in-out);
}
.active {
	opacity: 1;
	filter: blur(0);
	transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
	.icon {
		transition: opacity var(--rc-icon-swap-dur, 250ms) linear !important;
		filter: none !important;
		transform: none !important;
	}
}
</style>
