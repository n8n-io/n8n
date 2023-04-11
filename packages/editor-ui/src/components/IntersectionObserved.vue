<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import emitter from '@/mixins/emitter';

export default mixins(emitter).extend({
	name: 'IntersectionObserved',
	props: ['enabled'],
	mounted() {
		if (!this.enabled) {
			return;
		}

		this.$nextTick(() => {
			this.$dispatch('IntersectionObserver', 'observe', this.$refs.observed);
		});
	},
	beforeDestroy() {
		if (this.enabled) {
			this.$dispatch('IntersectionObserver', 'unobserve', this.$refs.observed);
		}
	},
});
</script>
