<script lang="ts" setup>
import { computed } from 'vue';

/**
 * Two-option switch row: a label on the left, the two option names and a
 * sliding knob on the right. The `switch` control of a card's switcher.
 */
const props = withDefaults(
	defineProps<{
		options: Array<{ key: string; label: string }>;
		modelValue: string;
		label?: string;
	}>(),
	{ label: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [key: string] }>();

const pair = computed(() => props.options.slice(0, 2));
const on = computed(() => pair.value[1]?.key === props.modelValue);

function toggle() {
	const next = on.value ? pair.value[0] : pair.value[1];
	if (next) emit('update:modelValue', next.key);
}
</script>

<template>
	<div :class="$style.row">
		<span v-if="label" :class="$style.label">{{ label }}</span>
		<span :class="[$style.option, { [$style.current]: !on }]">{{ pair[0]?.label }}</span>
		<button
			type="button"
			role="switch"
			:class="$style.track"
			:aria-checked="on"
			:aria-label="label ?? pair.map((option) => option.label).join(' / ')"
			data-test-id="result-card-switch"
			@click="toggle"
		>
			<span :class="$style.knob" />
		</button>
		<span :class="[$style.option, { [$style.current]: on }]">{{ pair[1]?.label }}</span>
	</div>
</template>

<style lang="scss" module>
@use './tokens';

.row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	line-height: 20px;
}
.label {
	flex: 1;
	min-width: 0;
	color: var(--rc-fg);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.option {
	flex: none;
	color: var(--rc-muted);
	transition: color var(--rc-tabs-dur, 250ms) var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.current {
	color: var(--rc-fg);
	font-weight: 500;
}
.track {
	@include tokens.rc-button-reset;
	position: relative;
	flex: none;
	width: 36px;
	height: 22px;
	border-radius: 11px;
	background: var(--rc-chip-hover);
	transition:
		background-color var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out),
		transform var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out);
	&[aria-checked='true'] {
		background: var(--rc-accent);
	}
	&:active {
		transform: scale(var(--rc-press-scale, 0.99));
	}
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.knob {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: var(--rc-surface);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	transition: transform var(--rc-tabs-dur, 250ms)
		var(--rc-tabs-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.track[aria-checked='true'] .knob {
	transform: translateX(14px);
}

@media (prefers-reduced-motion: reduce) {
	.track,
	.knob,
	.option {
		transition: none !important;
	}
}
</style>
