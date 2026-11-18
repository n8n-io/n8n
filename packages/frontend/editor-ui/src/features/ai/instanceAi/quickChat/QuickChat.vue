<script lang="ts" setup>
/**
 * Quick chat: a small floating Assistant chat. It opens next to the Assistant rail item,
 * the user can drag it by its header, and it keeps its thread across pages.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { getThreadDisplayTitle } from '../instanceAi.threadRuntime';
import QuickChatConversation from './QuickChatConversation.vue';
import { useQuickChat } from './useQuickChat';

const PANEL_WIDTH = 380;
const PANEL_MAX_HEIGHT = 560;
/** Space between the panel and the window edges, and between the panel and its anchor */
const GAP = 8;

const i18n = useI18n();
const router = useRouter();
const projectsStore = useProjectsStore();
const instanceAiStore = useInstanceAiStore();
const quickChat = useQuickChat();
const { state } = quickChat;

const projectId = computed(() => projectsStore.personalProject?.id);

const title = computed(() => {
	if (state.isDraft) return i18n.baseText('quickChat.title');
	const summary = instanceAiStore.threads.find(({ id }) => id === state.threadId);
	const messages = instanceAiStore.getRuntime(state.threadId)?.messages ?? [];
	return getThreadDisplayTitle(summary, messages) ?? i18n.baseText('quickChat.title');
});

const panelRef = ref<HTMLElement | null>(null);
const position = ref({ left: GAP, top: GAP });
const height = ref(PANEL_MAX_HEIGHT);

function clamp(left: number, top: number) {
	const maxLeft = Math.max(GAP, window.innerWidth - PANEL_WIDTH - GAP);
	const maxTop = Math.max(GAP, window.innerHeight - height.value - GAP);
	return {
		left: Math.min(Math.max(left, GAP), maxLeft),
		top: Math.min(Math.max(top, GAP), maxTop),
	};
}

/** Each open starts next to the element that opened it */
function placeAtAnchor() {
	height.value = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - GAP * 2);
	const anchor = state.anchor;
	position.value = anchor
		? clamp(anchor.right + GAP, anchor.top - GAP)
		: clamp(window.innerWidth - PANEL_WIDTH - GAP, window.innerHeight - height.value - GAP);
}

watch(
	() => state.open,
	async (open) => {
		if (!open) return;
		placeAtAnchor();
		await nextTick();
		panelRef.value?.focus();
	},
	{ immediate: true },
);

function onWindowResize() {
	height.value = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - GAP * 2);
	position.value = clamp(position.value.left, position.value.top);
}
window.addEventListener('resize', onWindowResize);
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize));

// Dragging by the header. Pointer capture keeps the drag going when the pointer leaves the
// header, and the buttons in the header do not start a drag.
let dragStart: { x: number; y: number; left: number; top: number } | null = null;

function onDragStart(event: PointerEvent) {
	if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) {
		return;
	}
	dragStart = { x: event.clientX, y: event.clientY, ...position.value };
	if (event.currentTarget instanceof HTMLElement) {
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	event.preventDefault();
}

function onDragMove(event: PointerEvent) {
	if (!dragStart) return;
	position.value = clamp(
		dragStart.left + event.clientX - dragStart.x,
		dragStart.top + event.clientY - dragStart.y,
	);
}

function onDragEnd() {
	dragStart = null;
}

async function openInAssistant() {
	if (state.isDraft) return;
	const threadId = state.threadId;
	quickChat.close();
	await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
}

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
	event.preventDefault();
	quickChat.close();
}
</script>

<template>
	<Transition
		:enter-from-class="$style.hidden"
		:leave-to-class="$style.hidden"
		:enter-active-class="$style.animating"
		:leave-active-class="$style.animating"
	>
		<section
			v-if="state.open && projectId"
			ref="panelRef"
			:class="$style.panel"
			:style="{
				left: `${position.left}px`,
				top: `${position.top}px`,
				width: `${PANEL_WIDTH}px`,
				height: `${height}px`,
			}"
			role="dialog"
			:aria-label="i18n.baseText('quickChat.title')"
			tabindex="-1"
			data-test-id="quick-chat"
			@keydown="onKeydown"
		>
			<header
				:class="$style.header"
				data-test-id="quick-chat-header"
				@pointerdown="onDragStart"
				@pointermove="onDragMove"
				@pointerup="onDragEnd"
				@pointercancel="onDragEnd"
			>
				<N8nText bold color="text-dark" :class="$style.title">{{ title }}</N8nText>
				<N8nTooltip :content="i18n.baseText('quickChat.new')" placement="top">
					<N8nIconButton
						:class="$style.action"
						variant="ghost"
						size="small"
						icon="message-circle-plus"
						:aria-label="i18n.baseText('quickChat.new')"
						data-test-id="quick-chat-new"
						@click="quickChat.startNewChat"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('quickChat.openInAssistant')" placement="top">
					<N8nIconButton
						:class="$style.action"
						variant="ghost"
						size="small"
						icon="maximize-2"
						:disabled="state.isDraft"
						:aria-label="i18n.baseText('quickChat.openInAssistant')"
						data-test-id="quick-chat-open-in-assistant"
						@click="openInAssistant"
					/>
				</N8nTooltip>
				<N8nIconButton
					:class="$style.action"
					variant="ghost"
					size="small"
					icon="x"
					:aria-label="i18n.baseText('quickChat.close')"
					data-test-id="quick-chat-close"
					@click="quickChat.close"
				/>
			</header>
			<div :class="$style.body">
				<QuickChatConversation
					:key="state.threadId"
					:thread-id="state.threadId"
					:is-draft="state.isDraft"
					:project-id="projectId"
					@persisted="quickChat.markPersisted"
					@thread-missing="quickChat.startNewChat"
				/>
			</div>
		</section>
	</Transition>
</template>

<style lang="scss" module>
.panel {
	position: fixed;
	// Above the page and the navigation panel; Element Plus modals start at 2000.
	z-index: 1500;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	// A tight shadow for the edge and a wide, soft one, so the panel stands off the page.
	box-shadow:
		var(--shadow--xl),
		0 24px 48px -12px var(--shadow-color);

	&:focus-visible {
		outline: none;
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: var(--spacing--2xl);
	flex: none;
	padding: 0 var(--spacing--2xs) 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
	cursor: grab;
	user-select: none;
	touch-action: none;

	&:active {
		cursor: grabbing;
	}
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.action {
	color: var(--text-color--subtle);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.body {
	// The composer keeps the same space to the bottom and the sides, and uses smaller text.
	--instance-ai-input-padding: 0 var(--spacing--sm) var(--spacing--sm);
	--instance-ai-conversation-background: var(--background--surface);
	--chat-input--font-size: var(--font-size--sm);

	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.animating {
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);
}

.hidden {
	opacity: 0;
	transform: scale(0.98) translateX(calc(var(--spacing--4xs) * -1));
}

@media (prefers-reduced-motion: reduce) {
	.animating {
		transition: none;
	}

	.hidden {
		transform: none;
	}
}
</style>
