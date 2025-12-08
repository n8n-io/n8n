<script setup lang="ts">
import { CHAT_VIEW, MOBILE_MEDIA_QUERY } from '@/features/ai/chatHub/constants';
import { useMediaQuery, useEventListener } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { useUIStore } from '@/app/stores/ui.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';

const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
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
	<div :class="[$style.component, { [$style.isMobileDevice]: isMobileDevice }]">
		<slot />
	</div>
</template>

<style lang="scss" module>
.component {
	margin: var(--spacing--4xs);
	width: 100%;
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;

	&.isMobileDevice {
		margin: 0;
		border: none;
	}
}
</style>
