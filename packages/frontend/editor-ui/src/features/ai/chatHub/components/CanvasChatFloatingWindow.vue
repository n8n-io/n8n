<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useStorage } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { N8nFloatingWindow, N8nText } from '@n8n/design-system';
import { CHAT_TRIGGER_NODE_TYPE, LOCAL_STORAGE_FLOATING_CHAT_WINDOW } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import CanvasChatHubPanel from './CanvasChatHubPanel.vue';
import CanvasChatFloatingMenu from './CanvasChatFloatingMenu.vue';
import ChatAgentAvatar from './ChatAgentAvatar.vue';

const emit = defineEmits<{
	close: [];
	'pop-out': [];
}>();

const i18n = useI18n();
const workflowsStore = useWorkflowsStore();
const chatPanelStore = useChatPanelStore();

const canvasChatHubRef = ref<InstanceType<typeof CanvasChatHubPanel>>();
const canPopOut = computed(() => window.parent === window);

const chatTriggerNode = computed(() =>
	workflowsStore.allNodes.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE),
);

const agentDisplayName = computed(() => {
	const triggerName = chatTriggerNode.value?.parameters?.agentName;
	if (typeof triggerName === 'string' && triggerName.trim()) return triggerName.trim();
	return workflowsStore.workflowName || 'Workflow';
});

// --- Floating window position/size persistence ---
const CANVAS_MARGIN = 16;

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

const floatingWindowWidth = computed(() => floatingWindowState.value.width ?? chatPanelStore.width);
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
		:min-width="chatPanelStore.activeMinWidth"
		:min-height="300"
		:initial-position="floatingWindowPosition"
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
				{{ agentDisplayName }}
			</N8nText>
			<span :class="$style.previewBadge">
				{{ i18n.baseText('chatHub.canvas.previewBadge') }}
			</span>
		</template>
		<template #header-actions>
			<CanvasChatFloatingMenu
				v-if="canvasChatHubRef?.sessionId"
				:session-id="canvasChatHubRef.sessionId"
				:workflow-id="workflowsStore.workflowId"
				:can-pop-out="canPopOut"
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

.previewBadge {
	flex-shrink: 0;
	display: inline-block;
	color: var(--color--secondary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: 16px;
}
</style>
