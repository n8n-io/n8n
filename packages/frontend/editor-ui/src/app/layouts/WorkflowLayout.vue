<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';

const { layoutProps } = useLayoutProps();

const assistantStore = useAssistantStore();

const AppHeader = defineAsyncComponent(
	async () => await import('@/app/components/app/AppHeader.vue'),
);
const AppSidebar = defineAsyncComponent(
	async () => await import('@/app/components/app/AppSidebar.vue'),
);
const LogsPanel = defineAsyncComponent(
	async () => await import('@/features/execution/logs/components/LogsPanel.vue'),
);
</script>

<template>
	<BaseLayout>
		<template #header>
			<Suspense>
				<AppHeader />
			</Suspense>
		</template>
		<template #sidebar>
			<Suspense>
				<AppSidebar />
			</Suspense>
		</template>
		<RouterView v-slot="{ Component }">
			<KeepAlive include="NodeView" :max="1">
				<Component :is="Component" />
			</KeepAlive>
		</RouterView>
		<template v-if="layoutProps.logs" #footer>
			<Suspense>
				<LogsPanel />
			</Suspense>
		</template>
		<template #overlays>
			<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
		</template>
	</BaseLayout>
</template>
