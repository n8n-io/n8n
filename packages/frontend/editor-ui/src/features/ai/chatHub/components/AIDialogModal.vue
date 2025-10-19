<script setup lang="ts">
import { useTemplateRef, ref, onMounted, computed, watch } from 'vue';
import { useDraggable } from '@vueuse/core';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useResizablePanel } from '@/composables/useResizablePanel';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { AI_CHAT_DIALOG_MODAL_KEY } from '@/features/ai/chatHub/constants';
import ConversationListPane from './ConversationListPane.vue';
import ErrorDisplayPane from './ErrorDisplayPane.vue';
import ChatPrompt from './ChatPrompt.vue';
import { v4 as uuidv4 } from 'uuid';

const chatStore = useChatStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const container = useTemplateRef('container');
const wrapper = useTemplateRef('wrapper');
const header = useTemplateRef('header');

// Window state
const isOpen = computed(() => uiStore.modalsById[AI_CHAT_DIALOG_MODAL_KEY]?.open === true);

// Default window dimensions
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const MAX_WIDTH_VW = 95;
const MAX_HEIGHT_VH = 95;

// Window position and size state
const windowX = ref(0);
const windowY = ref(0);
const windowWidth = ref(DEFAULT_WIDTH);
const windowHeight = ref(DEFAULT_HEIGHT);

// Resize state
const isResizing = ref(false);
const resizeHandle = ref<string | null>(null);
const resizeStartX = ref(0);
const resizeStartY = ref(0);
const resizeStartWidth = ref(0);
const resizeStartHeight = ref(0);
const resizeStartPosX = ref(0);
const resizeStartPosY = ref(0);

// Load saved position and size from localStorage
function loadWindowState() {
	try {
		const savedPosition = localStorage.getItem('aiDialog_windowPosition');
		const savedSize = localStorage.getItem('aiDialog_windowSize');

		if (savedPosition) {
			const { x, y } = JSON.parse(savedPosition);
			windowX.value = x;
			windowY.value = y;
		} else {
			// Default position: bottom-right with 20px margin
			windowX.value = window.innerWidth - DEFAULT_WIDTH - 20;
			windowY.value = window.innerHeight - DEFAULT_HEIGHT - 20;
		}

		if (savedSize) {
			const { width, height } = JSON.parse(savedSize);
			windowWidth.value = width;
			windowHeight.value = height;
		}
	} catch (e) {
		// If parsing fails, use defaults
		windowX.value = window.innerWidth - DEFAULT_WIDTH - 20;
		windowY.value = window.innerHeight - DEFAULT_HEIGHT - 20;
		windowWidth.value = DEFAULT_WIDTH;
		windowHeight.value = DEFAULT_HEIGHT;
	}
}

// Save position to localStorage
function savePosition() {
	localStorage.setItem(
		'aiDialog_windowPosition',
		JSON.stringify({ x: windowX.value, y: windowY.value }),
	);
}

// Save size to localStorage
function saveSize() {
	localStorage.setItem(
		'aiDialog_windowSize',
		JSON.stringify({ width: windowWidth.value, height: windowHeight.value }),
	);
}

// Setup draggable functionality
const { style: draggableStyle } = useDraggable(wrapper, {
	handle: header,
	initialValue: { x: windowX.value, y: windowY.value },
	onEnd: (position) => {
		// Constrain to viewport bounds (keep at least 50px of header visible)
		const maxX = window.innerWidth - 50;
		const maxY = window.innerHeight - 50;
		const minX = -(windowWidth.value - 50);
		const minY = 0;

		windowX.value = Math.max(minX, Math.min(maxX, position.x));
		windowY.value = Math.max(minY, Math.min(maxY, position.y));

		savePosition();
	},
});

// Resize handle logic
function startResize(handle: string, event: MouseEvent) {
	isResizing.value = true;
	resizeHandle.value = handle;
	resizeStartX.value = event.clientX;
	resizeStartY.value = event.clientY;
	resizeStartWidth.value = windowWidth.value;
	resizeStartHeight.value = windowHeight.value;
	resizeStartPosX.value = windowX.value;
	resizeStartPosY.value = windowY.value;

	event.preventDefault();
	event.stopPropagation();

	document.addEventListener('mousemove', handleResizeMove);
	document.addEventListener('mouseup', handleResizeEnd);
}

function handleResizeMove(event: MouseEvent) {
	if (!isResizing.value || !resizeHandle.value) return;

	const deltaX = event.clientX - resizeStartX.value;
	const deltaY = event.clientY - resizeStartY.value;

	const maxWidth = (window.innerWidth * MAX_WIDTH_VW) / 100;
	const maxHeight = (window.innerHeight * MAX_HEIGHT_VH) / 100;

	const handle = resizeHandle.value;

	// Calculate new dimensions based on handle
	let newWidth = resizeStartWidth.value;
	let newHeight = resizeStartHeight.value;
	let newX = resizeStartPosX.value;
	let newY = resizeStartPosY.value;

	if (handle.includes('right')) {
		newWidth = resizeStartWidth.value + deltaX;
	}
	if (handle.includes('left')) {
		newWidth = resizeStartWidth.value - deltaX;
		newX = resizeStartPosX.value + deltaX;
	}
	if (handle.includes('bottom')) {
		newHeight = resizeStartHeight.value + deltaY;
	}
	if (handle.includes('top')) {
		newHeight = resizeStartHeight.value - deltaY;
		newY = resizeStartPosY.value + deltaY;
	}

	// Apply constraints
	newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth));
	newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, newHeight));

	// Adjust position if resizing from left or top
	if (handle.includes('left')) {
		newX = resizeStartPosX.value + (resizeStartWidth.value - newWidth);
	}
	if (handle.includes('top')) {
		newY = resizeStartPosY.value + (resizeStartHeight.value - newHeight);
	}

	windowWidth.value = newWidth;
	windowHeight.value = newHeight;
	windowX.value = newX;
	windowY.value = newY;
}

function handleResizeEnd() {
	isResizing.value = false;
	resizeHandle.value = null;
	document.removeEventListener('mousemove', handleResizeMove);
	document.removeEventListener('mouseup', handleResizeEnd);

	saveSize();
	savePosition();
}

// Close window
function closeWindow() {
	uiStore.closeModal(AI_CHAT_DIALOG_MODAL_KEY);
}

// Handle escape key
function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && isOpen.value) {
		closeWindow();
	}
}

onMounted(() => {
	loadWindowState();
	document.addEventListener('keydown', handleKeydown);
});

// Update draggable position when window state changes
watch([windowX, windowY], () => {
	if (wrapper.value && !isResizing.value) {
		wrapper.value.style.left = `${windowX.value}px`;
		wrapper.value.style.top = `${windowY.value}px`;
	}
});

// Panel resize logic (existing)
const {
	size: leftPaneWidth,
	onResize: onLeftPaneResize,
	onResizeEnd: onLeftPaneResizeEnd,
} = useResizablePanel('aiDialog_leftPaneWidth', {
	container,
	defaultSize: 300,
	minSize: 200,
	maxSize: 500,
});

const {
	size: middlePaneWidth,
	onResize: onMiddlePaneResize,
	onResizeEnd: onMiddlePaneResizeEnd,
} = useResizablePanel('aiDialog_middlePaneWidth', {
	container,
	defaultSize: 350,
	minSize: 250,
	maxSize: 500,
});

function handleSubmitMessage(message: string) {
	// Get current workflow context
	const workflowContext = {
		name: workflowsStore.workflowName,
		nodes: workflowsStore.allNodes.map((n) => ({
			name: n.name,
			type: n.type,
			position: n.position,
			parameters: n.parameters,
		})),
		connections: workflowsStore.allConnections,
	};

	// Add workflow context to the message
	const contextualMessage = `${message}\n\n[Workflow Context: ${JSON.stringify(workflowContext)}]`;

	// Ensure we have a session ID
	if (!chatStore.currentSessionId) {
		// Create a new session by generating a session ID
		const sessionId = uuidv4();
		chatStore.setCurrentSessionId(sessionId);
	}

	// Send message to chat backend
	// Note: This requires a model and credentials to be selected in the chat UI
	// The chat store will handle this and show an error if not configured
	chatStore.sendMessage(
		chatStore.currentSessionId!,
		contextualMessage,
		null, // Model will be selected in chat UI
		null, // Credentials will be selected in chat UI
	);
}
</script>

<template>
	<div v-if="isOpen" :class="$style['ai-dialog-wrapper']">
		<div
			ref="wrapper"
			:class="$style['ai-dialog-window']"
			:style="{
				width: `${windowWidth}px`,
				height: `${windowHeight}px`,
				left: `${windowX}px`,
				top: `${windowY}px`,
			}"
			role="dialog"
			aria-label="AI Chat Assistant"
		>
			<div ref="header" :class="$style['ai-dialog-header']">
				<h3>AI Chat Assistant</h3>
				<button
					:class="$style['close-button']"
					aria-label="Close AI Chat"
					@click="closeWindow"
				>
					×
				</button>
			</div>

			<div ref="container" :class="$style['ai-dialog-body']">
				<N8nResizeWrapper
					:supported-directions="['right']"
					:width="leftPaneWidth"
					:style="{ width: `${leftPaneWidth}px` }"
					:class="$style['left-pane']"
					@resize="onLeftPaneResize"
					@resizeend="onLeftPaneResizeEnd"
				>
					<ConversationListPane />
				</N8nResizeWrapper>

				<N8nResizeWrapper
					:supported-directions="['right']"
					:width="middlePaneWidth"
					:style="{ width: `${middlePaneWidth}px` }"
					:class="$style['middle-pane']"
					@resize="onMiddlePaneResize"
					@resizeend="onMiddlePaneResizeEnd"
				>
					<div :class="$style['middle-pane-content']">
						<ChatPrompt
							placeholder="Type your message..."
							:disabled="false"
							@submit="handleSubmitMessage"
						/>
					</div>
				</N8nResizeWrapper>

				<div :class="$style['right-pane']">
					<ErrorDisplayPane />
				</div>
			</div>

			<!-- Resize handles -->
			<div
				:class="$style['resize-handle-top']"
				@mousemove="startResize('top', $event)"
			></div>
			<div
				:class="$style['resize-handle-right']"
				@mousemove="startResize('right', $event)"
			></div>
			<div
				:class="$style['resize-handle-bottom']"
				@mousemove="startResize('bottom', $event)"
			></div>
			<div
				:class="$style['resize-handle-left']"
				@mousemove="startResize('left', $event)"
			></div>
			<div
				:class="$style['resize-handle-top-left']"
				@mousemove="startResize('top-left', $event)"
			></div>
			<div
				:class="$style['resize-handle-top-right']"
				@mousemove="startResize('top-right', $event)"
			></div>
			<div
				:class="$style['resize-handle-bottom-left']"
				@mousemove="startResize('bottom-left', $event)"
			></div>
			<div
				:class="$style['resize-handle-bottom-right']"
				@mousemove="startResize('bottom-right', $event)"
			></div>
		</div>
	</div>
</template>

<style module lang="scss">
.ai-dialog-wrapper {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 9999;
	pointer-events: none;
}

.ai-dialog-window {
	position: fixed;
	pointer-events: auto;
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.ai-dialog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-foreground-base);
	background: var(--color-background-light);
	cursor: move;
	user-select: none;

	h3 {
		margin: 0;
		font-size: var(--font-size-l);
		font-weight: 600;
	}
}

.close-button {
	background: none;
	border: none;
	font-size: 24px;
	line-height: 1;
	color: var(--color-text-base);
	cursor: pointer;
	padding: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s;

	&:hover {
		color: var(--color-primary);
	}
}

.ai-dialog-body {
	display: flex;
	height: 100%;
	overflow: hidden;
	flex: 1;
}

.left-pane {
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
}

.middle-pane {
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
	display: flex;
	flex-direction: column;
}

.middle-pane-content {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	padding: var(--spacing-m);
}

.right-pane {
	flex-grow: 1;
	height: 100%;
	overflow: auto;
	min-width: 150px;
}

// Resize handles
.resize-handle-top,
.resize-handle-right,
.resize-handle-bottom,
.resize-handle-left {
	position: absolute;
	z-index: 10;
}

.resize-handle-top {
	top: 0;
	left: 8px;
	right: 8px;
	height: 8px;
	cursor: ns-resize;
}

.resize-handle-right {
	top: 8px;
	right: 0;
	bottom: 8px;
	width: 8px;
	cursor: ew-resize;
}

.resize-handle-bottom {
	bottom: 0;
	left: 8px;
	right: 8px;
	height: 8px;
	cursor: ns-resize;
}

.resize-handle-left {
	top: 8px;
	left: 0;
	bottom: 8px;
	width: 8px;
	cursor: ew-resize;
}

.resize-handle-top-left,
.resize-handle-top-right,
.resize-handle-bottom-left,
.resize-handle-bottom-right {
	position: absolute;
	width: 16px;
	height: 16px;
	z-index: 11;
}

.resize-handle-top-left {
	top: 0;
	left: 0;
	cursor: nwse-resize;
}

.resize-handle-top-right {
	top: 0;
	right: 0;
	cursor: nesw-resize;
}

.resize-handle-bottom-left {
	bottom: 0;
	left: 0;
	cursor: nesw-resize;
}

.resize-handle-bottom-right {
	bottom: 0;
	right: 0;
	cursor: nwse-resize;
}
</style>
