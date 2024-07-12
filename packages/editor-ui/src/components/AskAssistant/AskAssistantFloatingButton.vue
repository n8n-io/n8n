<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant.store';
import { computed } from 'vue';

const { openChat, chatEnabled, chatWindowOpen } = useAssistantStore();

const shouldShow = computed(() => {
	return chatEnabled && !chatWindowOpen;
});
</script>

<template>
	<div v-if="shouldShow" :class="$style.container">
		<n8n-a-i-assistant-button @click="openChat" />
	</div>
</template>

<style lang="scss" module>
.container {
	position: absolute;
	bottom: var(--spacing-s);
	right: var(--spacing-s);
}
</style>
