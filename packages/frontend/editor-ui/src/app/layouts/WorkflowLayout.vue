<script lang="ts" setup>
import { provide, computed } from 'vue';
import { useRoute } from 'vue-router';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import AppHeader from '@/app/components/app/AppHeader.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

const route = useRoute();
const { layoutProps } = useLayoutProps();
const assistantStore = useAssistantStore();

const workflowId = computed(() => {
	const name = route.params.name;
	return (Array.isArray(name) ? name[0] : name) as string;
});

provide(WorkflowIdKey, workflowId);
</script>

<template>
	<BaseLayout>
		<template #header>
			<AppHeader />
		</template>
		<template #sidebar>
			<AppSidebar />
		</template>
		<RouterView v-slot="{ Component }">
			<KeepAlive include="NodeView" :max="1">
				<Component :is="Component" />
			</KeepAlive>
		</RouterView>
		<template v-if="layoutProps.logs" #footer>
			<LogsPanel />
		</template>
		<template #overlays>
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
		</template>
	</BaseLayout>
</template>
