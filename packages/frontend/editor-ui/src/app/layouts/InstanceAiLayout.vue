<script lang="ts">
// The artifact logs panel starts closed on each page load. This module value
// keeps its open state while the user is in another view (INS-1192).
let isLogsPanelOpenInArtifact = false;
</script>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';

const pushConnectionStore = usePushConnectionStore();
const logsStore = useLogsStore();
const route = useRoute();
const instanceAiStore = useInstanceAiStore();
// An onboarding thread hides the sidebar until the user leaves the onboarding.
const showSidebar = computed(
	() => !instanceAiStore.isOnboardingChromeHidden(String(route.params.threadId ?? '')),
);

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
		<template v-if="showSidebar" #sidebar>
			<AppSidebar />
		</template>
		<RouterView />
	</BaseLayout>
</template>
