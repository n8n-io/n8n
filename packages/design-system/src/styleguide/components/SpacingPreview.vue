<template>
	<div>
		<div v-for="size in sizes" class="spacing-group" :key="size">
			<div class="spacing-example" :class="`${property[0]}${side ? side[0] : ''}-${size}`">
				<div class="spacing-box" />
				<div class="label">{{ property[0] }}{{ side ? side[0] : '' }}-{{ size }}</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'SpacingPreview',
	props: {
		property: {
			type: String,
			default: 'padding',
		},
		side: {
			type: String,
			default: '',
		},
	},
	computed: {
		sizes() {
			return [
				'0',
				'5xs',
				'4xs',
				'3xs',
				'2xs',
				'xs',
				's',
				'm',
				'l',
				'xl',
				'2xl',
				'3xl',
				'4xl',
				'5xl',
			].concat(this.property === 'margin' ? ['auto'] : []);
		},
	},
});
</script>

<style lang="scss">
$box-size: 64px;

.spacing-group {
	border: var(--border-base);
	margin: var(--spacing-s);
	display: inline-flex;
}

.spacing-example {
	background: white;
	position: relative;
	background: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.25);
}

.spacing-box {
	width: $box-size;
	height: $box-size;
	display: block;
	position: relative;
	background: var(--color-primary);
}

.label {
	position: absolute;
	bottom: -1rem;
	right: 0;
	font-size: var(--font-size-s);
}
</style>
