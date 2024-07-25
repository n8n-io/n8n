<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from 'n8n-design-system/components/AskAssistantChat/AskAssistantChat.vue';

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();

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
}

async function onCodeReplace(index: number) {
	await assistantStore.applyCodeDiff(index);
}

async function undoCodeDiff(index: number) {
	await assistantStore.undoCodeDiff(index);
}
</script>

<template>
	<SlideTransition>
		<n8n-resize-wrapper
			v-if="assistantStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="assistantStore.chatWidth"
			:class="$style.container"
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
					@close="() => assistantStore.closeChat()"
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
	z-index: 3000; /* Above NDV, below notifications */
}

.wrapper {
	height: 100%;
}
</style>
