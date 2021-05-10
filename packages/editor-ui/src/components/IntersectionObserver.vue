<template>
	<div ref="root">
		<slot :observer="observer"></slot>
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
			root: (this.$refs.root  as Vue).$el,
			rootMargin: '0px',
			threshold: this.$props.threshold,
		};

		this.$data.observer = new IntersectionObserver((entries) => {
			entries.forEach(({target, isIntersecting}) => {
				this.$emit('observed', {
					el: target,
					isIntersecting,
				});
			});
		}, options);
	},
	beforeDestroy() {
		this.$data.observer.disconnect();
	},
});
</script>
