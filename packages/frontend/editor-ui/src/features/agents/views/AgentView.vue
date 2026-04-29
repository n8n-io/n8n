<script setup lang="ts"></script>

<template>
	<div :class="$style.agentView">
		<RouterView />
	</div>
</template>

<style module>
.agentView {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	min-height: 0;
}
</style>
