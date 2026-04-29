<script setup lang="ts"></script>

<template>
	<div class="agent-view-page" :class="$style.agentView">
		<RouterView />
	</div>
</template>

<style lang="scss" module>
.agentView {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	min-height: 0;
}

:global(.app-grid:has(.agent-view-page) > #sidebar) {
	position: relative;
	z-index: var(--app-sidebar--z);
}
</style>
