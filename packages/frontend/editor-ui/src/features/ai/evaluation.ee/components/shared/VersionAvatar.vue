<script setup lang="ts">
import { computed } from 'vue';

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

// Letters cycle past Z. We rarely show >5 versions on one card, but the
// modulo keeps `Z`, `AA`, etc. legible if a collection ever does.
const label = computed(() => {
	const i = props.index;
	if (i < 26) return String.fromCharCode(65 + i);
	const first = Math.floor(i / 26) - 1;
	const second = i % 26;
	return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
});

// Palette tokens. Maps to semantic states so dark mode + brand changes
// keep the avatars in step with the rest of the eval UI. Order chosen so
// the first 3 hit "neutral / success / warn" which matches the Figma
// frame's baseline / tone-tuned / temp 0.3 example.
const PALETTE = [
	'--color--neutral-800',
	'--color--green-600',
	'--color--orange-500',
	'--color--blue-600',
	'--color--purple-600',
	'--color--red-600',
] as const;

const swatch = computed(() => `var(${PALETTE[props.index % PALETTE.length]})`);
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
