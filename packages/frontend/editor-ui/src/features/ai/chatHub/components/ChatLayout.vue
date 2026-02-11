<script setup lang="ts">
import { useUIStore } from '@/app/stores/ui.store';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useEventListener } from '@vueuse/core';
import { useRouter } from 'vue-router';

const router = useRouter();
const uiStore = useUIStore();
const { isCtrlKeyPressed } = useDeviceSupport();

// Cmd+Shift+O to start new chat
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
	if (
		event.key.toLowerCase() === 'o' &&
		isCtrlKeyPressed(event) &&
		event.shiftKey &&
		!uiStore.isAnyModalOpen
	) {
		event.preventDefault();
		event.stopPropagation();
		void router.push({ name: CHAT_VIEW, force: true });
	}
});
</script>

<template>
	<div :class="$style.component">
		<slot />
	</div>
</template>

<style lang="scss" module>
.component {
	width: 100%;
	background-color: var(--color--background--light-2);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;
}
</style>
