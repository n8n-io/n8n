<script lang="ts" setup>
import { computed } from 'vue';

import { avatarColors, initialsOf } from './avatars';

const props = withDefaults(defineProps<{ name: string; initials?: string; size?: number }>(), {
	initials: undefined,
	size: 24,
});

const colors = computed(() => avatarColors(props.name));
const text = computed(() => initialsOf(props.name, props.initials));
</script>

<template>
	<span
		:class="$style.av"
		:style="{ '--av-bg': colors.bg, '--av-fg': colors.fg, '--av-size': `${size}px` }"
		role="img"
		:aria-label="name"
		>{{ text }}</span
	>
</template>

<style lang="scss" module>
.av {
	display: inline-grid;
	place-items: center;
	flex: none;
	box-sizing: border-box;
	width: var(--av-size, 24px);
	height: var(--av-size, 24px);
	border-radius: 50%;
	background: color-mix(in srgb, var(--av-bg) 70%, transparent);
	color: var(--av-fg);
	font-size: max(10px, calc(var(--av-size, 24px) * 0.4));
	font-weight: 500;
	line-height: 1;
	letter-spacing: 0;
	box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);
	user-select: none;
}
:global([data-theme='dark']) .av {
	background: color-mix(in srgb, var(--av-fg) 30%, #202020);
	color: var(--av-bg);
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .av {
		background: color-mix(in srgb, var(--av-fg) 30%, #202020);
		color: var(--av-bg);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
	}
}
</style>
