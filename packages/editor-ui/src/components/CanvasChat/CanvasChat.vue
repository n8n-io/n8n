<script setup lang="ts">
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantChat from 'n8n-design-system/components/AskAssistantChat/AskAssistantChat.vue';
import { useTelemetry } from '@/composables/useTelemetry';

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();
const telemetry = useTelemetry();

const height = ref(0);

const chatWidth = ref(0);
const logsWidth = ref(0);

const rootStyles = computed(() => {
	return {
		'--chat-width': chatWidth.value + 'px',
		'--logs-width': logsWidth.value + 'px',
		'--panel-height': height.value + 'px',
	};
});
function onResize(data) {
	console.log('🚀 ~ onResize ~ direction:', data);
	height.value = data.height;
	// assistantStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

function onResizeHorizontal(
	component: 'chat' | 'logs',
	data: { direction: string; x: number; width: number },
) {
	if (component === 'chat') {
		chatWidth.value = data.width;
	} else {
		logsWidth.value = data.width;
	}
}
</script>

<template>
	<n8n-resize-wrapper
		v-show="true"
		:supported-directions="['top']"
		:class="$style.container"
		:height="height"
		data-test-id="ask-assistant-sidebar"
		@resize="onResizeDebounced"
		:style="rootStyles"
	>
		<div :class="$style.content">
			<n8n-resize-wrapper
				v-show="true"
				:supported-directions="['right']"
				:width="chatWidth"
				:class="$style.chat"
				@resize="(data) => onResizeHorizontal('chat', data)"
			>
				Chat
			</n8n-resize-wrapper>
			<div :class="$style.logs" @resize="(data) => onResizeHorizontal('logs', data)">Logs</div>
		</div>
	</n8n-resize-wrapper>
</template>

<style lang="scss" module>
.container {
	height: var(--panel-height);
	min-height: 3rem;
	flex-basis: content;
	z-index: 300;
	// transform: translateY(-18rem);
}
.content {
	display: flex;
	width: 100%;
	height: 100%;
}
.chat {
	width: var(--chat-width);
	min-width: 5rem;
	border-right: 2px solid var(--color-foreground-base);
}
.logs {
	width: var(--logs-width);
}
</style>
