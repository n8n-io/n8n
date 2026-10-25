<script setup lang="ts">
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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

const i18n = useI18n();
const rootStore = useRootStore();
const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();

const runtime = ref<AssistantThreadRuntime | undefined>(
	knownAssistantThreadRuntime(props.threadId, {
		assistantAgentEnabled: settingsStore.isAssistantAgentEnabled,
		isAssistantThread: (threadId) => store.threads.some((thread) => thread.id === threadId),
	}),
);
const lookupFailed = ref(false);

async function lookUpRuntime(): Promise<void> {
	lookupFailed.value = false;
	try {
		runtime.value = await lookUpAssistantThreadRuntime(
			props.threadId,
			async (threadId) =>
				await getSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, threadId),
		);
	} catch {
		// The thread can still be an Assistant agent thread, so do not guess a runtime.
		lookupFailed.value = true;
	}
}

onMounted(async () => {
	if (runtime.value) return;
	await lookUpRuntime();
});
</script>

<template>
	<InstanceAiThreadView v-if="runtime?.kind === 'assistant'" :thread-id="props.threadId" />
	<AssistantAgentThreadView
		v-else-if="runtime?.kind === 'assistant-agent'"
		:thread-id="props.threadId"
		:project-id="runtime.projectId"
	/>
	<div
		v-else-if="lookupFailed"
		:class="$style.status"
		role="alert"
		data-test-id="instance-ai-thread-route-error"
	>
		<N8nText>{{ i18n.baseText('instanceAi.thread.loadError') }}</N8nText>
		<N8nButton
			variant="outline"
			size="small"
			data-test-id="instance-ai-thread-route-retry"
			@click="lookUpRuntime"
		>
			{{ i18n.baseText('generic.retry') }}
		</N8nButton>
	</div>
	<div v-else :class="$style.status" data-test-id="instance-ai-thread-route-loading">
		<N8nSpinner size="large" />
	</div>
</template>

<style lang="scss" module>
.status {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	align-items: center;
	justify-content: center;
}
</style>
