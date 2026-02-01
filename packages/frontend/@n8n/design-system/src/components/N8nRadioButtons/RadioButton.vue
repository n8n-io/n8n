<script lang="ts" setup>
interface RadioButtonProps {
	label: string;
	value: string;
	active?: boolean;
	disabled?: boolean;
	size?: 'small' | 'small-medium' | 'medium';
	square?: boolean;
}

withDefaults(defineProps<RadioButtonProps>(), {
	active: false,
	disabled: false,
	size: 'medium',
	square: false,
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
			[$style.square]: square,
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
		color: var(--color--primary);
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
	border-radius: var(--radius);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	transition: background-color 0.2s ease;
	cursor: pointer;
	user-select: none;

	.square & {
		display: flex;
		align-items: center;
		justify-content: center;
	}
}

.disabled {
	cursor: not-allowed;
}

.medium {
	height: 26px;
	font-size: var(--font-size--2xs);
	padding: 0 var(--spacing--xs);

	.square & {
		width: 26px;
		padding: 0;
	}
}

.small-medium {
	height: 22px;
	font-size: var(--font-size--3xs);
	padding: 0 var(--spacing--2xs);

	.square & {
		width: 22px;
		padding: 0;
	}
}

.small {
	font-size: var(--font-size--3xs);
	height: 15px;
	padding: 0 var(--spacing--4xs);

	.square & {
		width: 15px;
		padding: 0;
	}
}

.active {
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text--shade-1);
}
</style>
