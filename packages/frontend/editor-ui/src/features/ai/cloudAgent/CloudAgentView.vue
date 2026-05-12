<script setup lang="ts">
import CloudAgentChat from './components/CloudAgentChat.vue';
</script>

<template>
	<div class="cloud-agent-view">
		<CloudAgentChat />
	</div>
</template>

<style scoped>
.cloud-agent-view {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	max-width: 900px;
	margin: 0 auto;
}
</style>
