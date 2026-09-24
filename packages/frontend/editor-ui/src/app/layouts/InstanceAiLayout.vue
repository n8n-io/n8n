<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';

const pushConnectionStore = usePushConnectionStore();
const route = useRoute();
const instanceAiStore = useInstanceAiStore();
// An onboarding thread hides the sidebar until the user leaves the onboarding.
const showSidebar = computed(
	() => !instanceAiStore.isOnboardingChromeHidden(String(route.params.threadId ?? '')),
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
