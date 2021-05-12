<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import emitter from '@/components/mixins/emitter';

export default mixins(
	emitter,
).extend({
	name: 'IntersectionObserved',
	mounted() {
		this.$nextTick(() => {
			this.$dispatch('IntersectionObserver', 'observe', this.$refs.observed);
		});
	},
	beforeDestroy() {
		this.$dispatch('IntersectionObserver', 'unobserve', this.$refs.observed);
	},
});
</script>
