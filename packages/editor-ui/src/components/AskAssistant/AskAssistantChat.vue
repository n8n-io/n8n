<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';

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
	await assistantStore.sendMessage({ content, quickReplyType });
}

async function onCodeReplace(index: number) {
	await assistantStore.applyCodeDiff(index);
}

async function applyCodeDiff(index: number) {
	await assistantStore.undoCodeDiff(index);
}
</script>

<template>
	<n8n-resize-wrapper
		v-if="assistantStore.canShowAssistant && assistantStore.chatWindowOpen"
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
			<n8n-ask-assistant-chat
				:user="user"
				:messages="assistantStore.chatMessages"
				@close="() => assistantStore.closeChat()"
				@message="onUserMessage"
				@codeReplace="onCodeReplace"
				@codeUndo="onCodeUndo"
			/>
		</div>
	</n8n-resize-wrapper>
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
