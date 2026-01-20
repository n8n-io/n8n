<script lang="ts" setup>
import BaseLayout from './BaseLayout.vue';
import { useLayoutProps } from '@/app/composables/useLayoutProps';
import AskAssistantFloatingButton from '@/features/ai/assistant/components/Chat/AskAssistantFloatingButton.vue';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import AppHeader from '@/app/components/app/AppHeader.vue';
import AppSidebar from '@/app/components/app/AppSidebar.vue';
import LogsPanel from '@/features/execution/logs/components/LogsPanel.vue';

const { layoutProps } = useLayoutProps();

const assistantStore = useAssistantStore();
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
