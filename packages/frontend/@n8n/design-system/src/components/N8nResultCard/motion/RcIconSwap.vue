<script lang="ts" setup>
import { provide, toRef } from 'vue';

import { RC_ICON_SWAP_STATE } from './iconSwapContext';

/**
 * Icon swap (transitions.dev): the stacked icons live in one grid cell; the one
 * whose key matches `state` is shown, the rest sit scaled down and blurred. An
 * empty state hides them all (the check-in button's idle slot).
 *
 * Children are `RcIconSwapItem`s; they read the state through provide/inject.
 */
const props = defineProps<{ state: string }>();

provide(RC_ICON_SWAP_STATE, toRef(props, 'state'));
</script>

<template>
	<span :class="$style.swap" :data-state="state || undefined"><slot /></span>
</template>

<style lang="scss" module>
.swap {
	position: relative;
	display: inline-grid;
	place-items: center;
}
</style>
