<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from 'n8n-design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

function onResize(data: { direction: string; x: number; width: number }) {
	assistantStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function onUserMessage(content: string, quickReplyType?: string) {
	await assistantStore.sendMessage({ text: content, quickReplyType });
	const task = 'error';
	const solutionCount =
		task === 'error'
			? assistantStore.chatMessages.filter(
					(msg) => msg.role === 'assistant' && !['text', 'event'].includes(msg.type),
				).length
			: null;
	if (quickReplyType === 'all-good' || quickReplyType === 'still-stuck') {
		telemetry.track('User gave feedback', {
			task,
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

function onClose() {
	assistantStore.closeChat();
	telemetry.track('User closed assistant', { source: 'top-toggle' });
}
</script>

<template>
	<SlideTransition>
		<n8n-resize-wrapper
			v-if="assistantStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="assistantStore.chatWidth"
			:class="$style.container"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div
				:style="{ width: `${assistantStore.chatWidth}px` }"
				:class="$style.wrapper"
				data-test-id="ask-assistant-chat"
			>
				<AskAssistantChat
					:user="user"
					:messages="assistantStore.chatMessages"
					:streaming="assistantStore.streaming"
					@close="onClose"
					@message="onUserMessage"
					@code-replace="onCodeReplace"
					@code-undo="undoCodeDiff"
				/>
			</div>
		</n8n-resize-wrapper>
	</SlideTransition>
</template>

<style module>
.container {
	grid-area: rightsidebar;
	height: 100%;
	z-index: 99999; /* Needs to be high enough so it doesn't get covered by element-ui dialogs */
}

.wrapper {
	height: 100%;
}
</style>
