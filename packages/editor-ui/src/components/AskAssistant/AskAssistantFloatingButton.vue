<script setup lang="ts">
import type { VIEWS } from '@/constants';
import { EDITABLE_CANVAS_VIEWS } from '@/constants';
import { useAssistantStore } from '@/stores/assistant.store';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const assistantStore = useAssistantStore();
const route = useRoute();

const shouldShow = computed(() => {
	return (
		route.name &&
		EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS) &&
		assistantStore.chatEnabled &&
		!assistantStore.chatWindowOpen
	);
});
</script>

<template>
	<div v-if="shouldShow" :class="$style.container">
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
