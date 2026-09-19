<script lang="ts">
// The artifact logs panel starts closed on each page load. This module value
// keeps its open state while the user is in another view (INS-1192).
let isLogsPanelOpenInArtifact = false;
</script>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, watch } from 'vue';
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useLogsStore } from '@/app/stores/logs.store';

const pushConnectionStore = usePushConnectionStore();
const logsStore = useLogsStore();

// The store still holds the editor value when the user comes from the editor.
// Restore the artifact value and record each change. Runs open and collapse
// the panel in useInstanceAiWorkflowPreviewExecution.
logsStore.toggleOpen(isLogsPanelOpenInArtifact);
watch(
	() => logsStore.isOpen,
	(isOpen) => {
		isLogsPanelOpenInArtifact = isOpen;
	},
	{ flush: 'sync' },
);

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
