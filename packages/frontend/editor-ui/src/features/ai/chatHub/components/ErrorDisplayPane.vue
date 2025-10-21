<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { N8nIcon } from '@n8n/design-system';

const chatStore = useChatStore();

const currentError = computed(() => chatStore.currentError);
const errorTimestamp = ref<string>('');

watch(currentError, (newError) => {
	if (newError) {
		const now = new Date();
		errorTimestamp.value = now.toLocaleTimeString(); // Format: "HH:MM:SS"
	}
});
</script>

<template>
	<div :class="$style['error-display-pane']">
		<div v-if="currentError" :class="$style['error-content']">
			<div :class="$style['error-header']">
				<N8nIcon icon="exclamation-triangle" size="medium" color="danger" />
				<span :class="$style['error-title']">Error</span>
			</div>
			<div :class="$style['error-message']">{{ currentError }}</div>
			<div :class="$style['error-timestamp']">{{ errorTimestamp }}</div>
		</div>
		<div v-else :class="$style['no-error']">
			<span :class="$style['muted-text']">No errors</span>
		</div>
	</div>
</template>

<style module lang="scss">
.error-display-pane {
	height: 100%;
	padding: var(--spacing-s);
	overflow: auto;
}

.error-content {
	background: #fee;
	padding: 12px;
	border-radius: 4px;
	border: 1px solid #fcc;
}

.error-header {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
	margin-bottom: var(--spacing-xs);
}

.error-title {
	font-weight: 600;
	color: #d32f2f;
}

.error-message {
	color: #d32f2f;
	margin: 8px 0;
	word-wrap: break-word;
	white-space: pre-wrap;
}

.error-timestamp {
	font-size: 11px;
	color: #999;
	margin-top: var(--spacing-xs);
}

.no-error {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.muted-text {
	color: var(--color-text-light);
	font-size: var(--font-size-s);
}
</style>
