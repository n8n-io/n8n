<script setup lang="ts">
import { computed } from 'vue';

import { versionColorVar, versionLetter } from './versionPalette';

// Identity for a version in a collection comparison. The same `index`
// produces the same color across the wizard (avatar squares) and the
// collection-list cards (legend dots) so users can map "A · baseline"
// to the bar labelled "A" without re-reading the legend.
const props = withDefaults(
	defineProps<{
		index: number;
		variant?: 'square' | 'dot';
		size?: 'small' | 'medium';
	}>(),
	{
		variant: 'square',
		size: 'medium',
	},
);

const label = computed(() => versionLetter(props.index));

const swatch = computed(() => versionColorVar(props.index));
</script>

<template>
	<span
		v-if="variant === 'square'"
		:class="[$style.avatar, $style[size]]"
		:style="{ background: swatch }"
		data-test-id="version-avatar"
	>
		{{ label }}
	</span>
	<span
		v-else
		:class="[$style.dot, $style[size]]"
		:style="{ background: swatch }"
		data-test-id="version-avatar-dot"
		:aria-label="label"
	/>
</template>

<style module lang="scss">
.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--white);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius--md);
	line-height: 1;
	font-variant-numeric: tabular-nums;
}

.avatar.small {
	width: 18px;
	height: 18px;
	font-size: var(--font-size--2xs);
}

.avatar.medium {
	width: 24px;
	height: 24px;
	font-size: var(--font-size--xs);
}

.dot {
	display: inline-block;
	border-radius: var(--radius--full);
}

.dot.small {
	width: 8px;
	height: 8px;
}

.dot.medium {
	width: 10px;
	height: 10px;
}
</style>
