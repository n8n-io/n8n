<template>
	<span>
		{{ time }}
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { genericHelpers } from '@/mixins/genericHelpers';

export default defineComponent({
	name: 'ExecutionTime',
	mixins: [genericHelpers],
	props: ['startTime'],
	computed: {
		time(): string {
			if (!this.startTime) {
				return '...';
			}
			const msPassed = this.nowTime - new Date(this.startTime).getTime();
			return this.displayTimer(msPassed);
		},
	},
	data() {
		return {
			nowTime: -1,
			intervalTimer: null as null | NodeJS.Timeout,
		};
	},
	mounted() {
		this.setNow();
		this.intervalTimer = setInterval(() => {
			this.setNow();
		}, 1000);
	},
	destroyed() {
		// Make sure that the timer gets destroyed once no longer needed
		if (this.intervalTimer !== null) {
			clearInterval(this.intervalTimer);
		}
	},
	methods: {
		setNow() {
			this.nowTime = new Date().getTime();
		},
	},
});
</script>

<style lang="scss">
// .data-display-wrapper {

// }
</style>
