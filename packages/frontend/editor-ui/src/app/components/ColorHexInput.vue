<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	/** The color as `#rrggbb`. */
	modelValue: string;
	/** Accessible name for the hex field and the swatch. */
	label: string;
	testId?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const text = ref(props.modelValue);
watch(
	() => props.modelValue,
	(value) => {
		if (normalize(text.value) !== value.toLowerCase()) text.value = value;
	},
);

/** Accepts `#rgb` or `#rrggbb`, with or without `#`, and returns `#rrggbb`. */
function normalize(value: string): string | null {
	const hex = value.trim().replace(/^#/, '').toLowerCase();
	if (/^[0-9a-f]{3}$/.test(hex)) return `#${[...hex].map((c) => c + c).join('')}`;
	if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
	return null;
}

function onInput() {
	const color = normalize(text.value);
	if (color) emit('update:modelValue', color);
}

function onCommit() {
	text.value = normalize(text.value) ?? props.modelValue;
}

const swatch = computed({
	get: () => props.modelValue,
	set: (value: string) => {
		text.value = value;
		emit('update:modelValue', value.toLowerCase());
	},
});
</script>

<template>
	<span :class="$style.color">
		<input
			v-model="text"
			type="text"
			spellcheck="false"
			maxlength="7"
			:class="$style.hex"
			:aria-label="label"
			:data-test-id="testId ? `${testId}-hex` : undefined"
			@input="onInput"
			@blur="onCommit"
			@keydown.enter="onCommit"
		/>
		<input
			v-model="swatch"
			type="color"
			:class="$style.swatch"
			:aria-label="label"
			:data-test-id="testId"
		/>
	</span>
</template>

<style lang="scss" module>
.color {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.hex {
	box-sizing: border-box;
	width: calc(7.5ch + 2 * var(--spacing--2xs) + 2 * var(--border-width));
	height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text--tint-1);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	text-transform: uppercase;
	text-align: right;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}

	&:focus {
		border-color: var(--focus--border-color, var(--color--secondary));
		outline: none;
		box-shadow: 0 0 0 var(--border-width) var(--focus--border-color, var(--color--secondary));
	}
}

.swatch {
	box-sizing: border-box;
	width: var(--spacing--xl);
	height: var(--spacing--lg);
	padding: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: none;
	cursor: pointer;
}
</style>
