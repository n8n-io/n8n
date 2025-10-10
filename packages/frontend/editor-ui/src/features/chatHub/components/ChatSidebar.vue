<script lang="ts" setup>
import ModalDrawer from '@/components/ModalDrawer.vue';
import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY } from '@/constants';
import ChatSidebarContent from '@/features/chatHub/components/ChatSidebarContent.vue';
import { useUIStore } from '@/stores/ui.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';

const uiStore = useUIStore();
const { isMobileDevice } = useDeviceSupport();
const route = useRoute();

// Close drawer when navigation happens on mobile devices
watch(
	() => route.fullPath,
	() => {
		if (isMobileDevice) {
			uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
		}
	},
);

onBeforeUnmount(() => {
	uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
});
</script>

<template>
	<ModalDrawer
		v-if="isMobileDevice"
		direction="ltr"
		width="min(300px, 80vw)"
		:name="CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY"
		:class="$style.drawer"
		:close-on-click-modal="true"
		:show-close="false"
	>
		<template #content>
			<ChatSidebarContent />
		</template>
	</ModalDrawer>
	<ChatSidebarContent v-else :class="$style.static" />
</template>

<style lang="scss" module>
.drawer {
	& :global(.el-drawer__header) {
		padding: 0;
	}
}

.static {
	width: 200px;
	height: 100%;
	background-color: var(--color--background--light-3);
	border-right: var(--border-base);
	position: relative;
	overflow: auto;
}
</style>
