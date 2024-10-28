<template>
	<span>
		{{ time }}
	</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'ExecutionsTime',
	props: ['startTime'],
	data() {
		return {
			nowTime: -1,
			intervalTimer: null as null | NodeJS.Timeout,
		};
	},
	computed: {
		time(): string {
			if (!this.startTime) {
				return '...';
			}
			const msPassed = this.nowTime - new Date(this.startTime).getTime();
			return this.$locale.displayTimer(msPassed);
		},
	},
	mounted() {
		this.setNow();
		this.intervalTimer = setInterval(() => {
			this.setNow();
		}, 1000);
	},
	beforeUnmount() {
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
