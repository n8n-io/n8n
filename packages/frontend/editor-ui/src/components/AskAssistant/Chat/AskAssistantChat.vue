<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';
import AskAssistantChat from '@n8n/design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useBuilderStore } from '@/stores/builder.store';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{
	close: [];
}>();

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();
const builderStore = useBuilderStore();
const i18n = useI18n();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const loadingMessage = computed(() => assistantStore.assistantThinkingMessage);

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
	await assistantStore.applyCodeDiff(index);
	telemetry.track('User clicked solution card action', {
		action: 'replace_code',
	});
}

async function undoCodeDiff(index: number) {
	await assistantStore.undoCodeDiff(index);
	telemetry.track('User clicked solution card action', {
		action: 'undo_code_replace',
	});
}
</script>

<template>
	<div data-test-id="ask-assistant-chat" tabindex="0" class="wrapper" @keydown.stop>
		<AskAssistantChat
			:user="user"
			:messages="assistantStore.chatMessages"
			:streaming="assistantStore.streaming"
			:loading-message="loadingMessage"
			:session-id="assistantStore.currentSessionId"
			:title="
				builderStore.isAIBuilderEnabled
					? i18n.baseText('aiAssistant.n8nAi')
					: i18n.baseText('aiAssistant.assistant')
			"
			@close="emit('close')"
			@message="onUserMessage"
			@code-replace="onCodeReplace"
			@code-undo="undoCodeDiff"
		>
			<template #header>
				<slot name="header" />
			</template>
		</AskAssistantChat>
	</div>
</template>

<style scoped>
.wrapper {
	height: 100%;
	width: 100%;
}
</style>
