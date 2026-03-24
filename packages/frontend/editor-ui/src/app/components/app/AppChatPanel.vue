<script setup lang="ts">
import AssistantsHub from '@/features/ai/assistant/components/AssistantsHub.vue';
import InstanceAiCanvasPanel from '@/features/ai/instanceAi/components/InstanceAiCanvasPanel.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { useDebounce } from '@/app/composables/useDebounce';
import { ASK_AI_SLIDE_IN_DURATION_MS, ASK_AI_SLIDE_OUT_DURATION_MS } from '@/app/constants';
import { N8nResizeWrapper } from '@n8n/design-system';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps<{
	layoutRef: Element | null;
}>();

useProvideWorkflowId();

const chatPanelStore = useChatPanelStore();
const chatHubPanelStore = useChatHubPanelStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

const isInstanceAiActive = computed(() => settingsStore.isModuleActive('instance-ai'));
const chatPanelWidth = computed(() => chatPanelStore.width);
const slideInDuration = `${ASK_AI_SLIDE_IN_DURATION_MS}ms`;
const slideOutDuration = `${ASK_AI_SLIDE_OUT_DURATION_MS}ms`;

const updateGridWidth = async () => {
	await nextTick();
	if (props.layoutRef) {
		const { width, height } = props.layoutRef.getBoundingClientRect();
		uiStore.appGridDimensions = { width, height };
	}
};

onMounted(async () => {
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateGridWidth);
});

// As chat panel width changes, recalculate the total width regularly
// Skip when chatHub is open since it floats over the canvas
watch(chatPanelWidth, async () => {
	if (chatHubPanelStore.isOpen) return;
	await updateGridWidth();
});

function handleClose() {
	chatPanelStore.close();
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(
		(d: { width: number }) => chatPanelStore.updateWidth(d.width),
		{ debounceTime: 10, trailing: true },
		data,
	);
}
</script>

<template>
	<template v-if="isInstanceAiActive">
		<Transition
			:enter-active-class="$style.slideEnterActive"
			:enter-from-class="$style.slideFrom"
			:leave-active-class="$style.slideLeaveActive"
			:leave-to-class="$style.slideFrom"
		>
			<div
				v-show="chatPanelStore.isOpen"
				:class="$style.slideWrapper"
				:style="{ width: `${chatPanelWidth}px` }"
			>
				<N8nResizeWrapper
					:supported-directions="['left']"
					:width="chatPanelWidth"
					:min-width="chatPanelStore.MIN_CHAT_WIDTH"
					:max-width="chatPanelStore.MAX_CHAT_WIDTH"
					:class="$style.resizeWrapper"
					data-test-id="instance-ai-canvas-sidebar"
					@resize="onResizeDebounced"
				>
					<div :style="{ width: `${chatPanelWidth}px` }" :class="$style.wrapper">
						<InstanceAiCanvasPanel @close="handleClose" />
					</div>
				</N8nResizeWrapper>
			</div>
		</Transition>
	</template>
	<AssistantsHub v-else />
</template>

<style lang="scss" module>
.slideWrapper {
	overflow: hidden;
	height: 100%;
}

.slideEnterActive {
	transition: width v-bind(slideInDuration) ease-in-out;
}

.slideLeaveActive {
	transition: width v-bind(slideOutDuration) ease-in-out;
}

.slideFrom {
	width: 0 !important;
}

.resizeWrapper {
	z-index: var(--ask-assistant-chat--z);
}

.wrapper {
	height: 100%;
	display: flex;
	flex-direction: column;
}
</style>
