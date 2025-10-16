<script lang="ts" setup>
import ModalDrawer from '@/components/ModalDrawer.vue';
import { CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY } from '@/constants';
import ChatSidebarContent from '@/features/chatHub/components/ChatSidebarContent.vue';
import { MOBILE_MEDIA_QUERY } from '@/features/chatHub/constants';
import { useUIStore } from '@/stores/ui.store';
import { useMediaQuery } from '@vueuse/core';
import { onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';

const uiStore = useUIStore();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const route = useRoute();

watch(
	() => route.fullPath,
	() => uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY),
);

onBeforeUnmount(() => {
	uiStore.closeModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY);
});
</script>

<template>
	<ModalDrawer
		v-if="isMobileDevice"
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
	<ChatSidebarContent v-else :class="$style.static" :is-mobile-device="isMobileDevice" />
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
}

.static {
	width: 240px;
	background-color: var(--color--background--light-3);
	position: relative;
	overflow: auto;
}
</style>
