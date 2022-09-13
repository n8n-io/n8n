<template>
	<button :class="['n8n-square-button', $style.button]" v-on="$listeners">
		<span :class="$style.text">{{label}}</span>
	</button>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-square-button',
	props: {
		label: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.button {
	width: 28px;
	height: 29px;
	border-radius: var(--border-radius-base);
	border: var(--color-background-xlight);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		.text {
			color: var(--color-primary) !important;
		}
	}
}

.text {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-loose);
	color: var(--color-background-dark);
}
</style>
