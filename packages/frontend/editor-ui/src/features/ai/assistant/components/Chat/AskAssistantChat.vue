<script lang="ts" setup>
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { computed, ref, useSlots } from 'vue';
import { N8nAskAssistantChat, N8nInfoTip } from '@n8n/design-system';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import AskModeEmptyState from './AskModeEmptyState.vue';

const emit = defineEmits<{
	close: [];
}>();

const assistantStore = useAssistantStore();
const settingsStore = useSettingsStore();
const workflowState = injectWorkflowState();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const slots = useSlots();
const i18n = useI18n();

const n8nChatRef = ref<InstanceType<typeof N8nAskAssistantChat>>();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => assistantStore.assistantThinkingMessage);

const showUsabilityNotice = computed(
	() =>
		assistantStore.canManageAISettings && !settingsStore.settings.ai.allowSendingParameterValues,
);

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

async function onCodeReplace(index: number) {
	await assistantStore.applyCodeDiff(workflowState, index);
	telemetry.track('User clicked solution card action', {
		action: 'replace_code',
	});
}

async function undoCodeDiff(index: number) {
	await assistantStore.undoCodeDiff(workflowState, index);
	telemetry.track('User clicked solution card action', {
		action: 'undo_code_replace',
	});
}

defineExpose({
	focusInput: () => {
		n8nChatRef.value?.focusInput();
	},
});
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" :class="$style.wrapper" @keydown.stop>
		<N8nAskAssistantChat
			ref="n8nChatRef"
			:user="user"
			:messages="assistantStore.chatMessages"
			:streaming="assistantStore.streaming"
			:loading-message="loadingMessage"
			:session-id="assistantStore.currentSessionId"
			:input-placeholder="i18n.baseText('aiAssistant.askMode.inputPlaceholder')"
			@close="emit('close')"
			@message="onUserMessage"
			@stop="assistantStore.abortStreaming"
			@code-replace="onCodeReplace"
			@code-undo="undoCodeDiff"
		>
			<template v-if="slots.header || showUsabilityNotice" #header>
				<slot name="header" />
				<N8nInfoTip v-if="showUsabilityNotice" theme="warning" type="tooltip">
					<span>{{ i18n.baseText('aiAssistant.reducedHelp.chat.notice') }}</span>
				</N8nInfoTip>
			</template>
			<template #placeholder>
				<AskModeEmptyState />
			</template>
		</N8nAskAssistantChat>
	</div>
</template>

<style module lang="scss">
.wrapper {
	height: 100%;
	width: 100%;
}
</style>
