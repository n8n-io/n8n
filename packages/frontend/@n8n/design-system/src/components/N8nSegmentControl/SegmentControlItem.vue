<script lang="ts" setup>
import { RadioGroupItem } from 'reka-ui';

interface SegmentControlItemProps {
	label: string;
	value: string;
	disabled?: boolean;
	square?: boolean;
}

withDefaults(defineProps<SegmentControlItemProps>(), {
	disabled: false,
	square: false,
});

defineSlots<{ default?: {} }>();
</script>

<template>
	<RadioGroupItem
		:value="value"
		:disabled="disabled"
		:aria-label="label"
		:data-test-id="`radio-button-${value}`"
		:class="{
			'n8n-segment-control-item': true,
			[$style.item]: true,
			[$style.square]: square,
			[$style.hoverable]: !disabled,
		}"
	>
		<slot>
			{{ label }}
		</slot>
	</RadioGroupItem>
</template>

<style lang="scss" module>
@use '../../css/mixins/focus';

.item {
	--segment-control--item-height: calc(var(--input--height) - 2 * var(--segment-control--padding));

	appearance: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin: 0;
	border: none;
	border-radius: var(--radius--3xs);
	background: transparent;
	height: var(--segment-control--item-height);
	padding: var(--segment-control--item-padding);
	font-family: inherit;
	font-size: var(--segment-control--font-size);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	color: var(--text-color--subtle);
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
	-webkit-tap-highlight-color: transparent;

	position: relative;

	&:focus {
		outline: none;
	}

	@include focus.focus-visible-ring-offset;

	/* Keep the offset ring above neighboring hover/selected backgrounds */
	&:focus-visible {
		z-index: 1;
	}

	&[data-state='checked'] {
		color: var(--text-color);
		background-color: var(--color--foreground--tint-2);
	}

	&[data-state='checked'][data-disabled] {
		background-color: var(--background--disabled);
	}

	&[data-disabled] {
		cursor: not-allowed;
		color: var(--text-color--disabled);
	}
}

@media (hover: hover) {
	.hoverable:hover:not([data-state='checked']):not([data-disabled]) {
		color: var(--text-color);
		background-color: var(--color--foreground--tint-1);
	}

	/* Sticky hover after keyboard nav — cleared when the pointer moves again */
	:global(.n8n-segment-control[data-suppress-hover]) .hoverable:hover:not([data-state='checked']) {
		color: var(--text-color--subtle);
		background-color: transparent;
	}
}

.square {
	width: var(--segment-control--item-height);
	padding: 0;
}
</style>
