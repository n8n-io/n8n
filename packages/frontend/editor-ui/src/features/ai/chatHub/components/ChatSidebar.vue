<script lang="ts" setup>
import ModalDrawer from '@/app/components/ModalDrawer.vue';
import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY } from '@/app/constants';
import ChatSidebarContent from '@/features/ai/chatHub/components/ChatSidebarContent.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { MOBILE_MEDIA_QUERY } from '@/features/ai/chatHub/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useMediaQuery } from '@vueuse/core';
import { onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';

const uiStore = useUIStore();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const route = useRoute();
const sidebar = useChatHubSidebarState();

watch(
	() => route.fullPath,
	() => uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY),
);

onBeforeUnmount(() => {
	uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
});
</script>

<template>
	<ChatSidebarContent
		v-if="sidebar.isStatic.value"
		:class="$style.static"
		:is-mobile-device="isMobileDevice"
	/>
	<ModalDrawer
		v-else
		direction="ltr"
		width="min(240px, 80vw)"
		:name="CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY"
		:class="$style.drawer"
		:close-on-click-modal="true"
		:show-close="false"
	>
		<template #content>
			<ChatSidebarContent :class="$style.inDrawer" :is-mobile-device="isMobileDevice" />
		</template>
	</ModalDrawer>
</template>

<style lang="scss" module>
.drawer {
	& :global(.el-drawer__header) {
		padding: 0;
	}
}

.inDrawer,
.static {
	height: 100%;
	background-color: var(--color--background--light-2);
}

.static {
	width: 240px;
	position: relative;
	overflow: auto;
	margin-right: calc(-1 * var(--spacing--4xs));
}
</style>
