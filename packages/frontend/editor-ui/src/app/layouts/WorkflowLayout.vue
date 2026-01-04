<script lang="ts" setup>
import { ref, defineAsyncComponent } from 'vue';
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import AppChatPanel from '@/app/components/app/AppChatPanel.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';

const { layoutProps } = useLayoutProps();

const assistantStore = useAssistantStore();

const layoutRef = ref<Element | null>(null);

const AppHeader = defineAsyncComponent(
	async () => await import('@/app/components/app/AppHeader.vue'),
);
const AppSidebar = defineAsyncComponent(
	async () => await import('@/app/components/app/AppSidebar.vue'),
);
const LogsPanel = defineAsyncComponent(
	async () => await import('@/features/execution/logs/components/LogsPanel.vue'),
);

const setLayoutRef = (el: Element) => {
	layoutRef.value = el;
};
</script>

<template>
	<BaseLayout @mounted="setLayoutRef">
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
		<AskAssistantFloatingButton v-if="assistantStore.isFloatingButtonShown" />
		<template #aside>
			<AppChatPanel v-if="layoutRef" :layout-ref="layoutRef" />
		</template>
		<template v-if="layoutProps.logs" #footer>
			<Suspense>
				<LogsPanel />
			</Suspense>
		</template>
	</BaseLayout>
</template>
