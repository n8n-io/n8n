<script lang="ts" setup>
/**
 * A small pill-shaped label that can optionally act as a button.
 * Use for inline status indicators, counts, or any short contextual label
 */
import { ref } from 'vue';

defineOptions({ name: 'N8nActionPill' });

withDefaults(
	defineProps<{
		/** Text to display when the default slot is empty. */
		text?: string;
		/** When set, swaps to this text on hover (e.g. show a count normally, an action label on hover). */
		hoverText?: string;
		/** Enables pointer cursor and hover styles — use when the pill triggers an action. */
		clickable?: boolean;
		/** 'small' matches PreviewTag scale (for menus/lists); 'medium' is the default. */
		size?: 'small' | 'medium';
		/** Visual variant. 'default' is green; 'danger' is red for depleted/error states. */
		type?: 'default' | 'danger';
	}>(),
	{
		text: undefined,
		hoverText: undefined,
		clickable: false,
		size: 'medium',
		type: 'default',
	},
);

defineEmits<{
	click: [event: MouseEvent];
}>();

const hovered = ref(false);
</script>

<template>
	<span
		:class="[
			$style.root,
			size === 'small' && $style.small,
			type === 'danger' && $style.danger,
			clickable && $style.clickable,
			hoverText && hovered && $style.pressed,
		]"
		@mouseenter="hoverText && (hovered = true)"
		@mouseleave="hoverText && (hovered = false)"
		@click="$emit('click', $event)"
	>
		<span v-if="hoverText" :class="$style.labelGrid">
			<span :class="[$style.label, hovered && $style.labelHidden]"
				><slot>{{ text }}</slot></span
			>
			<span :class="[$style.label, !hovered && $style.labelHidden]">{{ hoverText }}</span>
		</span>
		<slot v-else>{{ text }}</slot>
	</span>
</template>

<style lang="scss" module>
.root {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: none;
	border-radius: 16px;
	background-color: var(--color--green-100);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--green-900);
	white-space: nowrap;
	box-shadow: none;
}

.small {
	padding: var(--spacing--5xs) var(--spacing--4xs);
	font-size: var(--font-size--3xs);
}

.danger {
	background-color: var(--color--danger--tint-4);
	color: var(--color--danger--shade-1);

	&.clickable:hover {
		background-color: var(--color--green-200);
		color: var(--color--green-950);
	}
}

.clickable {
	cursor: pointer;
	user-select: none;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;

	&:hover {
		background-color: var(--color--green-200);
		color: var(--color--green-950);
	}
}

.pressed {
	background-color: var(--color--green-200);
	color: var(--color--green-950);
}

.labelGrid {
	display: grid;
}

.label {
	grid-area: 1 / 1;
	text-align: center;
	transition: opacity 0.15s;
}

.labelHidden {
	opacity: 0;
	pointer-events: none;
}
</style>
