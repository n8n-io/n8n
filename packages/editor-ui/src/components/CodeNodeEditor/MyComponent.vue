<template>
	<div>
		<p>Times clicked: {{ count }}</p>
		<button @click="increment">increment</button>
	</div>
</template>

<script>
export default {
	data: () => ({
		count: 0,
	}),

	methods: {
		increment() {
			this.count++;
		},
	},
};
</script>
