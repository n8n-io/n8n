<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';

const assistantStore = useAssistantStore();

const onResize = (data: { direction: string; x: number; width: number }) => {
	assistantStore.updateWindowWidth(data.width);
};

const onResizeDebounced = (data: { direction: string; x: number; width: number }) => {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
};
</script>

<template>
	<n8n-resize-wrapper
		:supported-directions="['left']"
		:width="assistantStore.chatWidth"
		:min-width="assistantStore.MIN_CHAT_WIDTH"
		@resize="onResizeDebounced"
		:class="$style.container"
	>
		<div
			:style="{ width: `${assistantStore.chatWidth}px` }"
			:class="$style.wrapper"
			data-test-id="ask-assistant-chat"
		>
			<n8n-ask-assistant-chat />
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
