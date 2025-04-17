<script lang="ts" setup>
interface RadioButtonProps {
	label: string;
	value: string;
	active?: boolean;
	disabled?: boolean;
	size?: 'small' | 'medium';
	noPadding?: boolean;
}

withDefaults(defineProps<RadioButtonProps>(), {
	active: false,
	disabled: false,
	size: 'medium',
	noPadding: false,
});

defineSlots<{ default?: {} }>();
</script>

<template>
	<label
		role="radio"
		tabindex="-1"
		:class="{
			'n8n-radio-button': true,
			[$style.container]: true,
			[$style.hoverable]: !disabled,
			[$style.noPadding]: noPadding,
		}"
		:aria-checked="active"
	>
		<div
			:class="{
				[$style.button]: true,
				[$style.active]: active,
				[$style[size]]: true,
				[$style.disabled]: disabled,
			}"
			:data-test-id="`radio-button-${value}`"
		>
			<slot>
				{{ label }}
			</slot>
		</div>
	</label>
</template>

<style lang="scss" module>
.container {
	display: inline-block;
	outline: 0;
	position: relative;
}

.hoverable:hover {
	.button:not(.active) {
		color: var(--color-primary);
	}
}

.input {
	opacity: 0;
	outline: 0;
	z-index: -1;
	position: absolute;
}

.button {
	display: flex;
	align-items: center;
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-medium);
	color: var(--color-text-base);
	transition: background-color 0.2s ease;
	cursor: pointer;
	user-select: none;

	.noPadding & {
		padding-inline: 0;
	}
}

.disabled {
	cursor: not-allowed;
}

.medium {
	height: 26px;
	font-size: var(--font-size-2xs);
	padding: 0 var(--spacing-xs);
}

.small {
	font-size: var(--font-size-3xs);
	height: 15px;
	padding: 0 var(--spacing-4xs);
}

.active {
	background-color: var(--color-foreground-xlight);
	color: var(--color-text-dark);
}
</style>
