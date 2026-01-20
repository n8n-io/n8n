<script lang="ts" setup>
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed, ref, useSlots } from 'vue';
import { N8nAskAssistantChat } from '@n8n/design-system';
import AISettingsButton from '@/features/ai/assistant/components/Chat/AISettingsButton.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { useI18n } from '@n8n/i18n';
import AskModeEmptyState from './AskModeEmptyState.vue';

const emit = defineEmits<{
	close: [];
}>();

const assistantStore = useAssistantStore();
const workflowState = injectWorkflowState();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const telemetry = useTelemetry();
const slots = useSlots();
const i18n = useI18n();

const n8nChatRef = ref<InstanceType<typeof N8nAskAssistantChat>>();

const allowSendingParameterValues = computed(
	() => settingsStore.settings.ai.allowSendingParameterValues,
);

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => assistantStore.assistantThinkingMessage);

const showSettingsButton = computed(() => {
	return assistantStore.canManageAISettings;
});

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
			@code-replace="onCodeReplace"
			@code-undo="undoCodeDiff"
		>
			<template #header>
				<div :class="{ [$style.header]: true, [$style['with-slot']]: !!slots.header }">
					<slot name="header" />
					<AISettingsButton
						v-if="showSettingsButton"
						:show-usability-notice="!allowSendingParameterValues"
						:disabled="assistantStore.streaming"
					/>
				</div>
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

.header {
	display: flex;
	justify-content: end;
	align-items: center;
	flex: 1;

	&.with-slot {
		justify-content: space-between;
	}
}
</style>
