<template>
	<div ref="root">
		<slot></slot>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'IntersectionObserver',
	props: ['threshold', 'enabled'],
	data() {
		return {
			observer: null,
		};
	},
	mounted() {
		if (!this.enabled) {
			return;
		}

		const options = {
			root: this.$refs.root as Element,
			rootMargin: '0px',
			threshold: this.threshold,
		};

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(({ target, isIntersecting }) => {
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
		if (this.enabled) {
			this.$data.observer.disconnect();
		}
	},
});
</script>
