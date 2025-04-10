<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed, watch, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IWorkflowDataUpdate } from '@/Interface';
import { nodeViewEventBus } from '@/event-bus';
import { v4 as uuid } from 'uuid';
import { useI18n } from '@/composables/useI18n';

const builderStore = useBuilderStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const i18n = useI18n();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const workflowGenerated = ref(false);
const loadingMessage = computed(() => builderStore.assistantThinkingMessage);

function onResize(data: { direction: string; x: number; width: number }) {
	builderStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function onUserMessage(content: string, quickReplyType?: string, isFeedback = false) {
	// If there is no current session running, initialize the support chat session
	if (!builderStore.currentSessionId) {
		await builderStore.initSupportChat(content);
	} else {
		await builderStore.sendMessage({ text: content, quickReplyType });
	}
	if (isFeedback) {
		telemetry.track('User gave feedback', {
			chat_session_id: builderStore.currentSessionId,
			is_quick_reply: !!quickReplyType,
			is_positive: quickReplyType === 'all-good',
			response: content,
		});
	}
}

function onClose() {
	builderStore.closeChat();
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
	builderStore.addAssistantMessages(
		[
			{
				type: 'rate-workflow',
				content: i18n.baseText('aiAssistant.builder.feedbackPrompt'),
				role: 'assistant',
			},
		],
		uuid(),
	);
}

function onNewWorkflow() {
	builderStore.resetBuilderChat();
	workflowGenerated.value = false;
}

watch(
	() => builderStore.chatMessages,
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
			v-show="builderStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="builderStore.chatWidth"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div
				:style="{ width: `${builderStore.chatWidth}px` }"
				:class="$style.wrapper"
				data-test-id="ask-assistant-chat"
				tabindex="0"
				@keydown.stop
			>
				<AskAssistantChat
					:user="user"
					:messages="builderStore.chatMessages"
					:streaming="builderStore.streaming"
					:loading-message="loadingMessage"
					:session-id="builderStore.currentSessionId"
					:mode="i18n.baseText('aiAssistant.builder.mode')"
					@close="onClose"
					@message="onUserMessage"
					@insert-workflow="onInsertWorkflow"
				>
					<template #placeholder>{{ i18n.baseText('aiAssistant.builder.placeholder') }}</template>
					<template v-if="workflowGenerated" #inputPlaceholder>
						<n8n-button size="large" :class="$style.newWorkflowButton" @click="onNewWorkflow">
							{{ i18n.baseText('aiAssistant.builder.generateNew') }}
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
