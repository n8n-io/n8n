<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>

<script lang="ts">

import Vue from 'vue';

export default Vue.extend({
	name: 'IntersectionObserved',
	props: ['observer', 'ignore'],
	mounted() {
		if (this.$props.observer && !this.$props.ignore) {
			this.$props.observer.observe(this.$refs.observed);
		}
	},
	beforeDestroy() {
		if (this.$props.observer && !this.$props.ignore) {
			this.$props.observer.unobserve(this.$refs.observed);
		}
	},
});
</script>
