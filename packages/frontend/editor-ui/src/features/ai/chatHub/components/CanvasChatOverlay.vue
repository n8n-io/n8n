<script lang="ts" setup>
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { usePopOutWindow } from '@/features/execution/logs/composables/usePopOutWindow';
import CanvasChatFloatingWindow from './CanvasChatFloatingWindow.vue';

const route = useRoute();
const chatHubPanelStore = useChatHubPanelStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = computed(() =>
	workflowsStore.workflowId
		? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
		: undefined,
);

const canvasChatFloatingWindowRef = ref<InstanceType<typeof CanvasChatFloatingWindow>>();

const popOutContainer = useTemplateRef<HTMLElement>('popOutContainer');
const popOutContent = useTemplateRef<HTMLElement>('popOutContent');

const isPoppedOut = computed(() => chatHubPanelStore.isPoppedOut);
const isVisible = computed(() => chatHubPanelStore.isOpen);

// Lazy guard: mount the component tree once on first open, then keep it alive
// with v-show to avoid Vue's removeFragment crash on DOM nodes created in popout windows.
const hasBeenOpened = ref(false);

watch(
	isVisible,
	(val) => {
		if (val) {
			hasBeenOpened.value = true;
			// Re-focus input on reopen since the mount-time watcher won't re-fire
			void nextTick(() => {
				canvasChatFloatingWindowRef.value?.focusInput();
			});
		}
	},
	{ immediate: true },
);

const popOutWindowTitle = computed(
	() => `Chat - ${workflowDocumentStore.value?.name || 'Workflow'}`,
);
const shouldPopOut = computed(() => isPoppedOut.value && chatHubPanelStore.isOpen);

usePopOutWindow({
	title: popOutWindowTitle,
	initialWidth: 560,
	initialHeight: 700,
	container: popOutContainer,
	content: popOutContent,
	shouldPopOut,
	onRequestClose: () => {
		chatHubPanelStore.close();
	},
});

// Close the pop-out window when navigating away from the canvas (e.g. Executions tab).
// The overlay stays mounted inside WorkflowLayout, but the pop-out window's DOM
// references become stale when the canvas view unmounts.
watch(
	() => route.meta.nodeView,
	(isNodeView) => {
		if (!isNodeView && isPoppedOut.value) {
			chatHubPanelStore.close();
		}
	},
);

function onClose() {
	chatHubPanelStore.close();
}

function onPopOut() {
	chatHubPanelStore.popOut();
}

function focusInput() {
	canvasChatFloatingWindowRef.value?.focusInput();
}

defineExpose({ focusInput });
</script>

<template>
	<div ref="popOutContainer" :class="$style.popOutContainer">
		<div ref="popOutContent" :class="[$style.popOutContent, { [$style.poppedOut]: isPoppedOut }]">
			<CanvasChatFloatingWindow
				v-if="hasBeenOpened"
				v-show="isVisible"
				ref="canvasChatFloatingWindowRef"
				@close="onClose"
				@pop-out="onPopOut"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.popOutContainer {
	height: 100%;
}

.popOutContent {
	height: 100%;

	&.poppedOut {
		height: 100vh;
	}
}
</style>
