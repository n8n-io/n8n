<script setup lang="ts">
import SetupPanelCards from '@/features/setupPanel/components/SetupPanelCards.vue';
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-container">
		<SetupPanelCards />
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: 100%;
	width: 100%;
	justify-content: center;
	padding: var(--spacing--xs);
	overflow-y: auto;
	overflow-x: hidden;
	background-color: var(--color--background--light-1);
	position: relative;
	top: calc(-1 * var(--spacing--5xs));
}
</style>
