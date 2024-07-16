<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant.store';

const assistantStore = useAssistantStore();
</script>

<template>
	<div v-if="assistantStore.canShowAssistantFloatingButton" :class="$style.container">
		<n8n-a-i-assistant-button @click="assistantStore.openChat" />
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	bottom: var(--spacing-s);
	right: var(--spacing-s);
	z-index: 3000;
}
</style>
