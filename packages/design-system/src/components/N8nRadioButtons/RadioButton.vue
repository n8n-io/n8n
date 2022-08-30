<template>
	<label role="radio" tabindex="-1" :class="{'n8n-radio-button': true, [$style.container]: true, [$style.hoverable]: !this.disabled}" aria-checked="true">
		<input type="radio" tabindex="-1" autocomplete="off" :class="$style.input" :value="value">
		<div :class="{[$style.button]: true, [$style.active]: active, [$style[size]]: true, [$style.disabled]: disabled}" @click="$emit('click')">{{ label }}</div>
	</label>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
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
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['small', 'medium'].includes(value),
		},
		disabled: {
			type: Boolean,
		},
	},
});
</script>

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
	border-radius: 0;
	display: flex;
	align-items: center;
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	transition: background-color 0.2s ease;
	cursor: pointer;
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
