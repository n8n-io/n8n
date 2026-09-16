<script lang="ts" setup>
import { onMounted, onBeforeUnmount } from 'vue';
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useLogsStore } from '@/app/stores/logs.store';

const pushConnectionStore = usePushConnectionStore();

// The artifact logs panel starts closed and keeps its state for this session
// only. Runs open and collapse it (INS-1192). WorkflowLayout restores the
// editor value when the user goes back to the editor.
useLogsStore().toggleOpen(false);

onMounted(() => {
	pushConnectionStore.pushConnect();
});

onBeforeUnmount(() => {
	pushConnectionStore.pushDisconnect();
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
