<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
	<h1 class="heading">Hello from n8n</h1>
	<p class="text">Edit <code>src/pages/Home.vue</code> and run the build.</p>
	<section class="card counter">
		<p class="text">Clicked {{ count }} times</p>
		<button class="button" @click="count++">Click me</button>
	</section>
</template>

<style scoped>
.counter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: var(--spacing--lg);
}
</style>
