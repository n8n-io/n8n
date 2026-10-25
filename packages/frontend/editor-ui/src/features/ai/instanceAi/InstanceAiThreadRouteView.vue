<script setup lang="ts">
import { N8nSpinner } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref } from 'vue';

import { getSystemAgentThread } from '@/features/agents/composables/useAgentApi';

import AssistantAgentThreadView from './assistantAgent/AssistantAgentThreadView.vue';
import {
	ASSISTANT_AGENT_ID,
	knownAssistantThreadRuntime,
	lookUpAssistantThreadRuntime,
	type AssistantThreadRuntime,
} from './assistantAgent/assistantAgentThreads';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import InstanceAiThreadView from './InstanceAiThreadView.vue';

/**
 * `/assistant/:threadId` opens threads of both Assistant runtimes. This view
 * finds out which runtime runs the thread before either thread view mounts:
 * the current thread view starts a runtime for its thread as soon as it mounts.
 */
const props = defineProps<{ threadId: string }>();

const rootStore = useRootStore();
const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();

const runtime = ref<AssistantThreadRuntime | undefined>(
	knownAssistantThreadRuntime(props.threadId, {
		assistantAgentEnabled: settingsStore.isAssistantAgentEnabled,
		isAssistantThread: (threadId) => store.threads.some((thread) => thread.id === threadId),
	}),
);

onMounted(async () => {
	if (runtime.value) return;
	runtime.value = await lookUpAssistantThreadRuntime(
		props.threadId,
		async (threadId) =>
			await getSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, threadId),
	);
});
</script>

<template>
	<InstanceAiThreadView v-if="runtime?.kind === 'assistant'" :thread-id="props.threadId" />
	<AssistantAgentThreadView
		v-else-if="runtime?.kind === 'assistant-agent'"
		:thread-id="props.threadId"
		:project-id="runtime.projectId"
	/>
	<div v-else :class="$style.loading" data-test-id="instance-ai-thread-route-loading">
		<N8nSpinner size="large" />
	</div>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
}
</style>
