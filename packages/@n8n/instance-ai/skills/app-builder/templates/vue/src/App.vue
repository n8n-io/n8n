<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
	<main class="app">
		<RouterView />
	</main>
</template>

<style scoped>
.app {
	max-width: 720px;
	margin: 0 auto;
	padding: var(--spacing--xl);
}
</style>
