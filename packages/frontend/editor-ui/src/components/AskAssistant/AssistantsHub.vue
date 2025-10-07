<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { computed, onBeforeUnmount, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantBuild from './Agent/AskAssistantBuild.vue';
import AskAssistantChat from './Chat/AskAssistantChat.vue';

import { N8nResizeWrapper } from '@n8n/design-system';
import HubSwitcher from '@/components/AskAssistant/HubSwitcher.vue';

const builderStore = useBuilderStore();
const assistantStore = useAssistantStore();

const askAssistantBuildRef = ref<InstanceType<typeof AskAssistantBuild>>();
const askAssistantChatRef = ref<InstanceType<typeof AskAssistantChat>>();

const isBuildMode = ref(builderStore.isAIBuilderEnabled);

const chatWidth = computed(() => {
	return isBuildMode.value ? builderStore.chatWidth : assistantStore.chatWidth;
});

function onResize(data: { direction: string; x: number; width: number }) {
	builderStore.updateWindowWidth(data.width);
	assistantStore.updateWindowWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function toggleAssistantMode() {
	const wasOpen = builderStore.isAssistantOpen || assistantStore.isAssistantOpen;
	const switchingToBuild = !isBuildMode.value;

	isBuildMode.value = !isBuildMode.value;

	if (wasOpen) {
		// If chat is already open, just toggle the window flags without reloading
		if (switchingToBuild) {
			// Load sessions first if builder has no messages
			if (builderStore.chatMessages.length === 0) {
				await builderStore.fetchBuilderCredits();
				await builderStore.loadSessions();
			}
			builderStore.chatWindowOpen = true;
			assistantStore.chatWindowOpen = false;
		} else {
			assistantStore.chatWindowOpen = true;
			builderStore.chatWindowOpen = false;
		}
	} else {
		// Opening from closed state - use full open logic
		if (isBuildMode.value) {
			await builderStore.openChat();
		} else {
			assistantStore.openChat();
		}
	}
}

function onClose() {
	builderStore.closeChat();
	assistantStore.closeChat();
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
	if (['toggleChat', 'openChat', 'initErrorHelper', 'initCredHelp'].includes(name)) {
		isBuildMode.value = false;
	}
});

const unsubscribeBuilderStore = builderStore.$onAction(({ name }) => {
	if (['toggleChat', 'openChat', 'sendChatMessage'].includes(name)) {
		isBuildMode.value = true;
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
			v-show="builderStore.isAssistantOpen || assistantStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="chatWidth"
			:class="$style.resizeWrapper"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div :style="{ width: `${chatWidth}px` }" :class="$style.wrapper">
				<div :class="$style.assistantContent">
					<AskAssistantBuild v-if="isBuildMode" ref="askAssistantBuildRef" @close="onClose">
						<template #header>
							<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
						</template>
					</AskAssistantBuild>
					<AskAssistantChat v-else ref="askAssistantChatRef" @close="onClose">
						<!-- Header switcher is only visible when AIBuilder is enabled -->
						<template v-if="builderStore.isAIBuilderEnabled" #header>
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
