<script lang="ts" setup>
import { RadioGroupItem } from 'reka-ui';

import type { SegmentControlSize } from './SegmentControl.types';

interface SegmentControlItemProps {
	label: string;
	value: string;
	disabled?: boolean;
	size?: SegmentControlSize;
	square?: boolean;
}

withDefaults(defineProps<SegmentControlItemProps>(), {
	disabled: false,
	size: 'medium',
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
			[$style[size]]: true,
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
	appearance: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: relative;
	z-index: 1;
	margin: 0;
	border: none;
	border-radius: var(--radius--3xs);
	background: transparent;
	font-family: inherit;
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
	transition:
		background-color var(--duration--snappy) ease,
		color var(--duration--snappy) ease,
		box-shadow var(--duration--snappy) ease;
	cursor: pointer;
	user-select: none;
	white-space: nowrap;
	-webkit-font-smoothing: antialiased;
	text-rendering: optimizeLegibility;
	-webkit-tap-highlight-color: transparent;

	&:focus {
		outline: none;
	}

	@include focus.focus-visible-ring-offset;

	&[data-state='checked'] {
		color: var(--text-color);
	}

	&[data-disabled] {
		cursor: not-allowed;
		color: var(--text-color--disabled);
	}
}

@media (hover: hover) {
	.hoverable:hover:not([data-state='checked']):not([data-disabled]) {
		color: var(--text-color);
		background-color: var(--color--foreground--shade-1);
	}
}

.small {
	height: 22px;
	font-size: var(--font-size--3xs);
	padding: 0 var(--spacing--2xs);
	line-height: 1;

	&.square {
		width: 22px;
		padding: 0;
	}
}

.medium {
	height: 26px;
	font-size: var(--font-size--2xs);
	padding: 0 var(--spacing--xs);
	line-height: 1;

	&.square {
		width: 26px;
		padding: 0;
	}
}

.large {
	height: var(--height--md);
	font-size: var(--font-size--xs);
	padding: 0 var(--spacing--xs);
	line-height: 1;

	&.square {
		width: var(--height--md);
		padding: 0;
	}
}

.xlarge {
	height: var(--height--lg);
	font-size: var(--font-size--sm);
	padding: 0 var(--spacing--sm);
	line-height: 1;

	&.square {
		width: var(--height--lg);
		padding: 0;
	}
}
</style>
