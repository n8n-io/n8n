<script lang="ts" setup>
import { useBuilderStore } from '@/features/assistant/builder.store';
import { useChatPanelStore } from '@/features/assistant/chatPanel.store';
import { useAssistantStore } from '@/features/assistant/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { computed, onBeforeUnmount, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantBuild from './Agent/AskAssistantBuild.vue';
import AskAssistantChat from './Chat/AskAssistantChat.vue';
import { useRoute } from 'vue-router';
import { BUILDER_ENABLED_VIEWS } from '../constants';
import type { VIEWS } from '@/constants';

import { N8nResizeWrapper } from '@n8n/design-system';
import HubSwitcher from '@/features/assistant/components/HubSwitcher.vue';

const builderStore = useBuilderStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();
const route = useRoute();

const askAssistantBuildRef = ref<InstanceType<typeof AskAssistantBuild>>();
const askAssistantChatRef = ref<InstanceType<typeof AskAssistantChat>>();

const isBuildMode = computed(() => chatPanelStore.isBuilderModeActive);
const chatWidth = computed(() => chatPanelStore.width);

// Show toggle only when both modes are available in current view
const canToggleModes = computed(() => {
	const currentRoute = route?.name;
	return (
		builderStore.isAIBuilderEnabled &&
		currentRoute &&
		BUILDER_ENABLED_VIEWS.includes(currentRoute as VIEWS)
	);
});

function onResize(data: { direction: string; x: number; width: number }) {
	chatPanelStore.updateWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function toggleAssistantMode() {
	const wasOpen = chatPanelStore.isOpen;
	const switchingToBuild = !isBuildMode.value;
	const newMode = switchingToBuild ? 'builder' : 'assistant';

	if (wasOpen) {
		if (switchingToBuild) {
			// Load sessions before switching mode if builder has no messages
			if (builderStore.chatMessages.length === 0) {
				await builderStore.fetchBuilderCredits();
				await builderStore.loadSessions();
			}
		}

		// Now switch the mode - data is already loaded
		chatPanelStore.switchMode(newMode);
	} else {
		// Opening from closed state - use full open logic
		if (switchingToBuild) {
			await chatPanelStore.open({ mode: 'builder' });
		} else {
			await chatPanelStore.open({ mode: 'assistant' });
		}
	}
}

function onClose() {
	chatPanelStore.close();
}

function onSlideEnterComplete() {
	if (isBuildMode.value) {
		askAssistantBuildRef.value?.focusInput();
	} else {
		askAssistantChatRef.value?.focusInput();
	}
}

const unsubscribeAssistantStore = assistantStore.$onAction(({ name }) => {
	// When assistant is opened from error or credentials help
	// switch from build mode to chat mode
	if (['initErrorHelper', 'initCredHelp'].includes(name)) {
		chatPanelStore.switchMode('assistant');
	}
});

const unsubscribeBuilderStore = builderStore.$onAction(({ name }) => {
	if (['sendChatMessage'].includes(name)) {
		chatPanelStore.switchMode('builder');
	}
});

onBeforeUnmount(() => {
	unsubscribeAssistantStore();
	unsubscribeBuilderStore();
});
</script>

<template>
	<SlideTransition @after-enter="onSlideEnterComplete">
		<N8nResizeWrapper
			v-show="chatPanelStore.isOpen"
			:supported-directions="['left']"
			:width="chatWidth"
			:min-width="chatPanelStore.MIN_CHAT_WIDTH"
			:max-width="chatPanelStore.MAX_CHAT_WIDTH"
			:class="$style.resizeWrapper"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div :style="{ width: `${chatWidth}px` }" :class="$style.wrapper">
				<div :class="$style.assistantContent">
					<AskAssistantBuild v-if="isBuildMode" ref="askAssistantBuildRef" @close="onClose">
						<template v-if="canToggleModes" #header>
							<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
						</template>
					</AskAssistantBuild>
					<AskAssistantChat v-else ref="askAssistantChatRef" @close="onClose">
						<!-- Header switcher is only visible when both modes are available in current view -->
						<template v-if="canToggleModes" #header>
							<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
						</template>
					</AskAssistantChat>
				</div>
			</div>
		</N8nResizeWrapper>
	</SlideTransition>
</template>

<style lang="scss" module>
.resizeWrapper {
	z-index: var(--z-index-ask-assistant-chat);
}

.wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.assistantContent {
	flex: 1;
	overflow: hidden;
}
</style>
