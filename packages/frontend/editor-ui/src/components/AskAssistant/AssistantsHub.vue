<script lang="ts" setup>
import { useBuilderStore } from '@/stores/builder.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { computed, onBeforeUnmount, ref } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import AskAssistantBuild from './Agent/AskAssistantBuild.vue';
import AskAssistantChat from './Chat/AskAssistantChat.vue';

const builderStore = useBuilderStore();
const assistantStore = useAssistantStore();

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

function toggleAssistantMode() {
	isBuildMode.value = !isBuildMode.value;
	if (isBuildMode.value) {
		void builderStore.openChat();
	} else {
		assistantStore.openChat();
	}
}

function onClose() {
	builderStore.closeChat();
	assistantStore.closeChat();
}

const unsubscribeAssistantStore = assistantStore.$onAction(({ name }) => {
	// When assistant is opened from error or credentials help
	// switch from build mode to chat mode
	if (['initErrorHelper', 'initCredHelp', 'openChat'].includes(name)) {
		isBuildMode.value = false;
	}
});

const unsubscribeBuilderStore = builderStore.$onAction(({ name }) => {
	// When assistant is opened from error or credentials help
	// switch from build mode to chat mode
	if (name === 'sendChatMessage') {
		isBuildMode.value = true;
	}
});

onBeforeUnmount(() => {
	unsubscribeAssistantStore();
	unsubscribeBuilderStore();
});
</script>

<template>
	<SlideTransition>
		<N8nResizeWrapper
			v-show="builderStore.isAssistantOpen || assistantStore.isAssistantOpen"
			:supported-directions="['left']"
			:width="chatWidth"
			data-test-id="ask-assistant-sidebar"
			@resize="onResizeDebounced"
		>
			<div :style="{ width: `${chatWidth}px` }" :class="$style.wrapper">
				<div :class="$style.assistantContent">
					<AskAssistantBuild v-if="isBuildMode" @close="onClose">
						<template #header>
							<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
						</template>
					</AskAssistantBuild>
					<AskAssistantChat v-else @close="onClose">
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
