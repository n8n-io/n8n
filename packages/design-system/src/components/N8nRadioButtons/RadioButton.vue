<template>
	<label role="radio" tabindex="-1" :class="$style.container" aria-checked="true">
		<input type="radio" tabindex="-1" autocomplete="off" :class="$style.input" :value="value">
		<div :class="{[$style.button]: true, [$style.active]: active}" @click="$emit('click')">{{ label }}</div>
	</label>
</template>

<script lang="ts">
export default {
	name: 'n8n-radio-button',
	props: {
		label: {
			type: String,
			required: true,
		},
		value: {
			type: String,
			required: true,
		},
		active: {
			type: Boolean,
			default: false,
		},
	},
};
</script>

<style lang="scss" module>
.container {
	display: inline-block;
	outline: 0;
	position: relative;

	&:hover {
		.button:not(.active) {
			color: var(--color-primary);
		}
	}
}

.input {
	opacity: 0;
	outline: 0;
	z-index: -1;
	position: absolute;
}

.button {
	border-radius: 0;
	padding: 0 var(--spacing-s);
	display: flex;
	align-items: center;
	height: 26px;
	font-size: var(--font-size-2xs);
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	cursor: pointer;
	transition: background-color 0.2s ease;
}

.active {
	background-color: var(--color-foreground-xlight);
	color: var(--color-text-dark);
}
</style>
