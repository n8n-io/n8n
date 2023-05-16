<template>
	<span ref="observed">
		<slot></slot>
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import emitter from '@/mixins/emitter';

export default defineComponent({
	name: 'IntersectionObserved',
	mixins: [emitter],
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
