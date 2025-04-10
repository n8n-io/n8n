<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IWorkflowDataUpdate } from '@/Interface';
import { nodeViewEventBus } from '@/event-bus';
import { v4 as uuid } from 'uuid';

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const workflowGenerated = ref(false);
const loadingMessage = computed(() => assistantStore.assistantThinkingMessage);

function onResize(data: { direction: string; x: number; width: number }) {
	assistantStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function onUserMessage(content: string, quickReplyType?: string, isFeedback = false) {
	// If there is no current session running, initialize the support chat session
	if (!assistantStore.currentSessionId) {
		await assistantStore.initSupportChat(content);
	} else {
		await assistantStore.sendMessage({ text: content, quickReplyType });
	}
	const task = assistantStore.chatSessionTask;
	const solutionCount = assistantStore.chatMessages.filter(
		(msg) => msg.role === 'assistant' && !['text', 'event'].includes(msg.type),
	).length;
	if (isFeedback) {
		telemetry.track('User gave feedback', {
			task,
			chat_session_id: assistantStore.currentSessionId,
			is_quick_reply: !!quickReplyType,
			is_positive: quickReplyType === 'all-good',
			solution_count: solutionCount,
			response: content,
		});
	}
}

function onClose() {
	assistantStore.closeChat();
	telemetry.track('User closed assistant', { source: 'top-toggle' });
}

function onInsertWorkflow(code: string) {
	// TODO: Tracking
	let workflowData: IWorkflowDataUpdate;
	try {
		workflowData = JSON.parse(code);
	} catch (error) {
		console.error('Error parsing workflow data', error);
		return;
	}
	nodeViewEventBus.emit('importWorkflowData', { data: workflowData, tidyUp: true });
	workflowGenerated.value = true;
	assistantStore.addAssistantMessages(
		[{ type: 'rate-workflow', content: 'HOW WAS IT???', role: 'assistant' }],
		uuid(),
	);
}

function onNewWorkflow() {
	assistantStore.resetAssistantChat();
	workflowGenerated.value = false;
}

watch(
	() => assistantStore.chatMessages,
	(messages) => {
		if (workflowGenerated.value) return;

		const workflowGeneratedMessage = messages.find((msg) => msg.type === 'workflow-generated');
		if (workflowGeneratedMessage) {
			onInsertWorkflow(workflowGeneratedMessage.codeSnippet);
		}
	},
	{ deep: true },
);
</script>

<template>
	<SlideTransition>
		<N8nResizeWrapper
			v-show="assistantStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="assistantStore.chatWidth"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div
				:style="{ width: `${assistantStore.chatWidth}px` }"
				:class="$style.wrapper"
				data-test-id="ask-assistant-chat"
				tabindex="0"
				@keydown.stop
			>
				<AskAssistantChat
					:user="user"
					:messages="assistantStore.chatMessages"
					:streaming="assistantStore.streaming"
					:loading-message="loadingMessage"
					:session-id="assistantStore.currentSessionId"
					mode="AI Builder"
					@close="onClose"
					@message="onUserMessage"
					@insert-workflow="onInsertWorkflow"
				>
					<template #placeholder> Please describe the workflow you want to create. </template>
					<template v-if="workflowGenerated" #inputPlaceholder>
						<n8n-button size="large" :class="$style.newWorkflowButton" @click="onNewWorkflow">
							Generate new workflow
						</n8n-button>
					</template>
				</AskAssistantChat>
			</div>
		</N8nResizeWrapper>
	</SlideTransition>
</template>

<style module>
.wrapper {
	height: 100%;
}
.newWorkflowButton {
	width: 100%;
}
</style>
