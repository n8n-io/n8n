<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nFloatingWindow, N8nText } from '@n8n/design-system';
import { CHAT_TRIGGER_NODE_TYPE, LOCAL_STORAGE_FLOATING_CHAT_WINDOW } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import CanvasChatHubPanel from './CanvasChatHubPanel.vue';
import CanvasChatFloatingMenu from './CanvasChatFloatingMenu.vue';
import ChatAgentAvatar from './ChatAgentAvatar.vue';

const CANVAS_MARGIN = 16;

const emit = defineEmits<{
	close: [];
	'pop-out': [];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const chatHubPanelStore = useChatHubPanelStore();
const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);

const canvasChatHubRef = ref<InstanceType<typeof CanvasChatHubPanel>>();
const canPopOut = computed(() => window.parent === window);

const allNodes = computed(() => workflowDocumentStore?.value?.allNodes ?? []);
const chatTriggerNode = computed(() =>
	allNodes.value.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE),
);

const agentDisplayName = computed(() => {
	const triggerName = chatTriggerNode.value?.parameters?.agentName;
	if (typeof triggerName === 'string' && triggerName.trim()) return triggerName.trim();
	return workflowsStore.workflowName || 'Workflow';
});

const floatingWindowState = useStorage<{
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}>(LOCAL_STORAGE_FLOATING_CHAT_WINDOW, {});

function getCanvasOrigin(): { x: number; y: number } {
	const canvasEl = document.getElementById('canvas');
	if (canvasEl) {
		const rect = canvasEl.getBoundingClientRect();
		return { x: rect.left, y: rect.top };
	}
	return { x: 0, y: 0 };
}

const floatingWindowPosition = computed(() => {
	if (floatingWindowState.value.x !== undefined && floatingWindowState.value.y !== undefined) {
		return { x: floatingWindowState.value.x, y: floatingWindowState.value.y };
	}
	const origin = getCanvasOrigin();
	return {
		x: origin.x + CANVAS_MARGIN,
		y: origin.y + CANVAS_MARGIN,
	};
});

const CHAT_HUB_DEFAULT_WIDTH = 560;
const floatingWindowWidth = computed(
	() => floatingWindowState.value.width ?? CHAT_HUB_DEFAULT_WIDTH,
);
const floatingWindowHeight = computed(() => floatingWindowState.value.height ?? 700);

function onFloatingWindowMove(pos: { x: number; y: number }) {
	floatingWindowState.value = { ...floatingWindowState.value, x: pos.x, y: pos.y };
}

function onFloatingWindowResize(size: { width: number; height: number }) {
	floatingWindowState.value = {
		...floatingWindowState.value,
		width: size.width,
		height: size.height,
	};
}

// Focus input when mounted (no slide transition to trigger @after-enter)
watch(
	() => canvasChatHubRef.value,
	async (ref) => {
		if (ref) {
			await nextTick();
			ref.focusInput();
		}
	},
);

function focusInput() {
	canvasChatHubRef.value?.focusInput();
}

defineExpose({ focusInput, canvasChatHubRef });
</script>

<template>
	<N8nFloatingWindow
		:width="floatingWindowWidth"
		:height="floatingWindowHeight"
		:min-width="400"
		:min-height="300"
		:initial-position="floatingWindowPosition"
		:class="{ [$style.poppedOut]: isPoppedOut }"
		data-test-id="canvas-chat-floating-window"
		@close="emit('close')"
		@move="onFloatingWindowMove"
		@resize="onFloatingWindowResize"
	>
		<template #header-icon>
			<ChatAgentAvatar :agent="null" size="sm" />
		</template>
		<template #header>
			<N8nText size="medium" :bold="true" :class="$style.headerTitle">
				{{ i18n.baseText('chatHub.canvas.floatingTitle') }}
			</N8nText>
		</template>
		<template #header-actions>
			<CanvasChatFloatingMenu
				v-if="canvasChatHubRef?.sessionId"
				:session-id="canvasChatHubRef.sessionId"
				:workflow-id="workflowsStore.workflowId"
				:can-pop-out="canPopOut && !isPoppedOut"
				@select-session="canvasChatHubRef.handleSelectSession"
				@copy-session-id="canvasChatHubRef.copySessionId()"
				@new-session="canvasChatHubRef.handleNewSession()"
				@pop-out="emit('pop-out')"
			/>
		</template>
		<CanvasChatHubPanel
			ref="canvasChatHubRef"
			:floating="true"
			@close="emit('close')"
			@pop-out="emit('pop-out')"
		/>
	</N8nFloatingWindow>
</template>

<style lang="scss" module>
.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// When popped out, override N8nFloatingWindow's position:fixed + inline styles
// to fill the pop-out browser window instead of floating at saved coordinates
.poppedOut {
	position: static !important;
	width: 100% !important;
	height: 100vh !important;
	border-radius: 0 !important;
	box-shadow: none !important;
	border: none !important;
}
</style>
