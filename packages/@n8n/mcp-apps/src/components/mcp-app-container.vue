<script setup lang="ts">
defineProps<{
	busy: boolean;
	label: string;
}>();
</script>

<template>
	<main class="container" :aria-busy="busy" :aria-label="label">
		<slot />
	</main>
</template>

<style scoped lang="scss">
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: var(--spacing--xs);
	background: transparent;
}
</style>
