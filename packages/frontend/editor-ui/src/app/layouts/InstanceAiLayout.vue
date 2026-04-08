<script lang="ts" setup>
import { onMounted, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useSidebarLayout } from '@/app/composables/useSidebarLayout';

const pushConnectionStore = usePushConnectionStore();
const { isCollapsed, toggleCollapse } = useSidebarLayout();

// Auto-collapse sidebar when entering instance-ai, restore on exit
let wasCollapsed = isCollapsed.value;

onMounted(() => {
	pushConnectionStore.pushConnect();
	wasCollapsed = isCollapsed.value;
	if (!wasCollapsed) {
		toggleCollapse();
	}
});

onBeforeUnmount(() => {
	pushConnectionStore.pushDisconnect();
	if (isCollapsed.value !== wasCollapsed) {
		toggleCollapse();
	}
});
</script>

<template>
	<BaseLayout>
		<template #sidebar>
			<AppSidebar />
		</template>
		<RouterView />
	</BaseLayout>
</template>
