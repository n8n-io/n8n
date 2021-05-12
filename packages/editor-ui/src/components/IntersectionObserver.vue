<template>
	<div ref="root">
		<slot></slot>
	</div>	
</template>


<script lang="ts">

import Vue from 'vue';

export default Vue.extend({
	name: 'IntersectionObserver',
	props: ['threshold'],
	data() {
		return {
			observer: null,
		};
	},
	mounted() {
		const options = {
			root: this.$refs.root as Element,
			rootMargin: '0px',
			threshold: this.$props.threshold,
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(({target, isIntersecting}) => {
				this.$emit('observed', {
					el: target,
					isIntersecting,
				});
			});
		}, options);

		this.$data.observer = observer;

		this.$on('observe', (observed: Element) => {
			observer.observe(observed);
		});

		this.$on('unobserve', (observed: Element) => {
			observer.unobserve(observed);
		});
	},
	beforeDestroy() {
		this.$data.observer.disconnect();
	},
});
</script>
