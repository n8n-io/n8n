<script setup lang="ts">
/**
 * SPIKE (INS-1154) — throwaway slim chat body for the floating window.
 * Prefer composing Message / Input / StatusBar / ConfirmationPanel over mounting
 * full InstanceAiThreadView (full-page layout, route teardown, artifacts sidebar).
 */
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { N8nScrollArea, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiAttachment } from '@n8n/api-types';

import { messageHasVisibleContent } from '../builderAgents';
import { isPendingItemFloating } from '../confirmationKinds';
import { provideThread } from '../instanceAi.store';
import InstanceAiConfirmationPanel from './InstanceAiConfirmationPanel.vue';
import InstanceAiInput from './InstanceAiInput.vue';
import InstanceAiMessage from './InstanceAiMessage.vue';
import InstanceAiStatusBar from './InstanceAiStatusBar.vue';

const props = defineProps<{
	threadId: string;
}>();

const rootStore = useRootStore();
const thread = provideThread(props.threadId);

const visibleMessages = computed(() => thread.messages.filter(messageHasVisibleContent));
const hasFloatingConfirmation = computed(() =>
	thread.pendingConfirmations.some(isPendingItemFloating),
);
const hasInlineConfirmation = computed(() =>
	thread.pendingConfirmations.some((item) => !isPendingItemFloating(item)),
);

onMounted(() => {
	void thread.loadHistoricalMessages().then(() => {
		thread.connectSSE();
	});
});

onUnmounted(() => {
	// Keep the runtime alive across panel close so expand-to-full-view / reopen
	// can resume the same stream. INS-1157 owns disposal policy.
});

watch(
	() => props.threadId,
	(threadId, previous) => {
		if (threadId === previous) return;
		// provideThread only runs once at setup — remount via :key on the parent.
	},
);

function handleSubmit(message: string, attachments?: InstanceAiAttachment[]) {
	void thread.sendMessage(message, attachments, rootStore.pushRef);
}

function handleStop() {
	void thread.cancelRun();
}
</script>

<template>
	<div :class="$style.root" data-test-id="instance-ai-floating-chat-body">
		<N8nScrollArea :class="$style.messages">
			<div :class="$style.messagesInner">
				<N8nText
					v-if="visibleMessages.length === 0 && !hasInlineConfirmation"
					color="text-light"
					size="small"
				>
					Ask anything — this is the floating panel spike.
				</N8nText>
				<InstanceAiMessage
					v-for="message in visibleMessages"
					:key="message.id"
					:message="message"
				/>
				<!-- Setup / credential / questions / plan-review live here (not in the input slot). -->
				<InstanceAiConfirmationPanel kind="inline" />
				<InstanceAiStatusBar />
			</div>
		</N8nScrollArea>

		<div :class="$style.input">
			<InstanceAiConfirmationPanel v-if="hasFloatingConfirmation" kind="floating" />
			<InstanceAiInput
				v-else
				:is-streaming="thread.isStreaming"
				:is-submitting="thread.isSendingMessage"
				:is-awaiting-confirmation="thread.isAwaitingConfirmation"
				:is-plan-edit-mode="false"
				:is-workflow-builder-available="true"
				:current-thread-id="thread.id"
				@submit="handleSubmit"
				@stop="handleStop"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	background: var(--color--background--light-3);
}

.messages {
	flex: 1;
	min-height: 0;
}

.messagesInner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
}

.input {
	flex-shrink: 0;
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-top: var(--border);
}
</style>
