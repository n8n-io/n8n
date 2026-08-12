<script setup lang="ts">
/**
 * SPIKE (INS-1154) — Intercom-style dock: launcher circle bottom-right,
 * proactive offer bubble stacked above it, floating panel opens from here.
 */
import { computed, nextTick, onBeforeUnmount, useTemplateRef, watch, watchEffect } from 'vue';
import { useElementSize, useEventListener, useStorage } from '@vueuse/core';
import {
	N8nAssistantIcon,
	N8nAssistantText,
	N8nFloatingWindow,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { useLogsStore } from '@/app/stores/logs.store';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { isThreadAgentWorking } from '../composables/useIsAgentWorking';
import { useInstanceAiProactiveOffer } from '../composables/useInstanceAiProactiveOffer';
import {
	INSTANCE_AI_DOCK_EDGE_INSET as EDGE_INSET,
	INSTANCE_AI_DOCK_GAP as DOCK_GAP,
	INSTANCE_AI_LAUNCHER_SIZE as LAUNCHER_SIZE,
	getDockedPanelGeometry,
	setInstanceAiDockTopEdge,
} from '../instanceAiDock';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiPanelStore } from '../instanceAiPanel.store';
import InstanceAiFloatingChatBody from './InstanceAiFloatingChatBody.vue';
import InstanceAiOfferBubble from './InstanceAiOfferBubble.vue';

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 820;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
/** Bumped when dock geometry changes so stale absolute coords don't stick. */
const STORAGE_KEY = 'n8n-instance-ai-floating-panel-spike-v7';

const i18n = useI18n();
const toast = useToast();
const panelStore = useInstanceAiPanelStore();
const instanceAiStore = useInstanceAiStore();
const logsStore = useLogsStore();
const instanceAiAvailable = useInstanceAiAvailable();
const { activeOffer, accept, dismiss } = useInstanceAiProactiveOffer();
const floatingWindowRef =
	useTemplateRef<InstanceType<typeof N8nFloatingWindow>>('floatingWindowRef');
const anchorRef = useTemplateRef<HTMLElement>('anchorRef');

const showDock = computed(() => instanceAiAvailable.value);
const isOpen = computed(() => panelStore.isOpen);
const threadId = computed(() => panelStore.activeThreadId);
const showOfferBubble = computed(() => Boolean(activeOffer.value) && !isOpen.value);

/** Soft pulse on the launcher while the dock's thread is still busy. */
const isAgentWorking = computed(() => {
	const id = threadId.value;
	if (!id) return false;
	const runtime = instanceAiStore.getRuntime(id);
	return runtime ? isThreadAgentWorking(runtime) : false;
});

/** While an offer stands the circle grows into a labelled pill — a nudge, not a mystery icon. */
const launcherCta = computed(() =>
	showOfferBubble.value
		? (activeOffer.value?.cta ?? i18n.baseText('instanceAi.proactiveOffer.cta'))
		: null,
);

const launcherAriaLabel = computed(() => {
	if (launcherCta.value) return launcherCta.value;
	if (isAgentWorking.value) return i18n.baseText('instanceAi.backgroundTask.running');
	return i18n.baseText('aiAssistant.name');
});

/** Sit above the logs panel when it's open. */
const dockBottomOffset = computed(() => logsStore.height + EDGE_INSET);
const dockRightOffset = EDGE_INSET;

const anchorStyle = computed(() => ({
	right: `${dockRightOffset}px`,
	bottom: `${dockBottomOffset.value}px`,
	// Shared with the measured footprint above, so CSS and geometry can't drift.
	'--instance-ai-launcher-size': `${LAUNCHER_SIZE}px`,
}));

/**
 * Publish what the dock occupies so bottom-right toasts can lift above it.
 * Measured, so a stacked offer bubble is included as it appears and disappears.
 */
const { height: anchorHeight } = useElementSize(anchorRef);
watchEffect(() => {
	setInstanceAiDockTopEdge(
		showDock.value ? dockBottomOffset.value + (anchorHeight.value || LAUNCHER_SIZE) : 0,
	);
});
onBeforeUnmount(() => setInstanceAiDockTopEdge(0));

const floatingWindowState = useStorage<{
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}>(STORAGE_KEY, {});

/** Missing x/y means dock to the launcher; a drag writes coords and undocks. */
const isDocked = computed(
	() => floatingWindowState.value.x === undefined || floatingWindowState.value.y === undefined,
);

function dockedGeometry() {
	return getDockedPanelGeometry({
		panelWidth: floatingWindowState.value.width ?? DEFAULT_WIDTH,
		panelHeight: floatingWindowState.value.height ?? DEFAULT_HEIGHT,
		minHeight: MIN_HEIGHT,
		launcherSize: LAUNCHER_SIZE,
		edgeInset: EDGE_INSET,
		gap: DOCK_GAP,
		dockBottomOffset: dockBottomOffset.value,
	});
}

const floatingWindowPosition = computed(() => {
	if (!isDocked.value) {
		return { x: floatingWindowState.value.x!, y: floatingWindowState.value.y! };
	}
	const { x, y } = dockedGeometry();
	return { x, y };
});

const floatingWindowWidth = computed(() =>
	isDocked.value ? dockedGeometry().width : (floatingWindowState.value.width ?? DEFAULT_WIDTH),
);
const floatingWindowHeight = computed(() =>
	isDocked.value ? dockedGeometry().height : (floatingWindowState.value.height ?? DEFAULT_HEIGHT),
);

/** `resetPosition` emits move/resize — ignore those so docking doesn't look like a drag. */
let syncingDock = false;

function applyDockedPosition() {
	const geo = dockedGeometry();
	syncingDock = true;
	try {
		floatingWindowRef.value?.resetPosition(
			{ x: geo.x, y: geo.y },
			{ width: geo.width, height: geo.height },
		);
	} finally {
		syncingDock = false;
	}
}

function onMove(pos: { x: number; y: number }) {
	if (syncingDock) return;
	floatingWindowState.value = { ...floatingWindowState.value, x: pos.x, y: pos.y };
}

function onResize(size: { width: number; height: number }) {
	if (syncingDock) return;
	const wasDocked = isDocked.value;
	floatingWindowState.value = {
		...floatingWindowState.value,
		width: size.width,
		height: size.height,
	};
	// Resize only persists size; snap back to the launcher so the right edge
	// stays aligned (emit fires on mouseup, so this won't fight the drag).
	if (wasDocked) {
		void nextTick(() => applyDockedPosition());
	}
}

function onResetPosition() {
	floatingWindowState.value = {};
	void nextTick(() => applyDockedPosition());
}

/**
 * Keep a docked panel glued to the launcher when logs open/close or the
 * viewport resizes. Custom (dragged) positions are left alone.
 */
watch([isOpen, isDocked, dockBottomOffset], async ([open, docked]) => {
	if (!open || !docked) return;
	await nextTick();
	applyDockedPosition();
});

useEventListener(window, 'resize', () => {
	if (!isOpen.value || !isDocked.value) return;
	applyDockedPosition();
});

function onExpand() {
	void panelStore.expandToFullView();
}

/**
 * Sticky error toasts share this corner and say what the panel is about to
 * explain, so opening the panel retires them rather than talking over them.
 */
function dismissErrorToasts() {
	toast.clearAllStickyNotifications();
}

async function onAcceptOffer() {
	dismissErrorToasts();
	await accept();
}

function onLauncherClick() {
	if (showOfferBubble.value) {
		void onAcceptOffer();
		return;
	}
	if (!isOpen.value) dismissErrorToasts();
	void panelStore.toggle();
}
</script>

<template>
	<div v-if="showDock" :class="$style.dock" data-test-id="instance-ai-launcher-dock">
		<N8nFloatingWindow
			v-if="isOpen"
			ref="floatingWindowRef"
			:class="$style.window"
			:width="floatingWindowWidth"
			:height="floatingWindowHeight"
			:min-width="MIN_WIDTH"
			:min-height="MIN_HEIGHT"
			:initial-position="floatingWindowPosition"
			data-test-id="instance-ai-floating-panel-spike"
			@close="panelStore.close()"
			@move="onMove"
			@resize="onResize"
			@header-double-click="onResetPosition"
		>
			<template #header-icon>
				<N8nAssistantIcon size="large" />
			</template>
			<template #header>
				<N8nAssistantText
					size="large"
					:text="i18n.baseText('aiAssistant.name')"
					:class="$style.headerTitle"
				/>
			</template>
			<template #header-actions>
				<N8nTooltip
					v-if="threadId"
					:content="i18n.baseText('instanceAi.floatingPanel.expand')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nIconButton
						icon="maximize-2"
						variant="ghost"
						size="medium"
						:aria-label="i18n.baseText('instanceAi.floatingPanel.expand')"
						data-test-id="instance-ai-floating-panel-expand"
						@click="onExpand"
					/>
				</N8nTooltip>
			</template>

			<InstanceAiFloatingChatBody v-if="threadId" :key="threadId" :thread-id="threadId" />
			<div v-else :class="$style.empty">
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('instanceAi.floatingPanel.starting') }}
				</N8nText>
			</div>
		</N8nFloatingWindow>

		<div ref="anchorRef" :class="$style.anchor" :style="anchorStyle">
			<InstanceAiOfferBubble
				v-if="showOfferBubble && activeOffer"
				:class="$style.offer"
				:title="activeOffer.title"
				:detail="activeOffer.detail"
				@accept="onAcceptOffer"
				@dismiss="dismiss"
			/>

			<button
				type="button"
				:class="[
					$style.launcher,
					{
						[$style.launcherOpen]: isOpen,
						[$style.launcherWithCta]: launcherCta,
						[$style.launcherWorking]: isAgentWorking,
					},
				]"
				:aria-label="launcherAriaLabel"
				:aria-expanded="isOpen"
				:aria-busy="isAgentWorking"
				data-test-id="instance-ai-launcher-button"
				@click="onLauncherClick"
			>
				<span v-if="showOfferBubble && !launcherCta" :class="$style.badge" aria-hidden="true" />
				<span
					v-if="isAgentWorking"
					:class="$style.workingRing"
					aria-hidden="true"
					data-test-id="instance-ai-launcher-working"
				/>
				<span
					v-if="isAgentWorking"
					:class="[$style.workingRing, $style.workingRingDelayed]"
					aria-hidden="true"
				/>
				<N8nIcon :icon="isOpen ? 'x' : 'sparkles'" size="large" :class="$style.launcherIcon" />
				<span
					v-if="launcherCta"
					:class="$style.launcherCta"
					data-test-id="instance-ai-launcher-cta"
				>
					{{ launcherCta }}
				</span>
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
.dock {
	position: fixed;
	inset: 0;
	z-index: var(--ask-assistant-floating-button--z);
	pointer-events: none;
}

.window {
	z-index: var(--ask-assistant-floating-button--z);
	pointer-events: auto;
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: var(--spacing--md);
	text-align: center;
}

.anchor {
	position: fixed;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing--2xs);
	pointer-events: none;
}

.offer {
	pointer-events: auto;
	position: static;
	width: fit-content;
	max-width: min(20rem, calc(100vw - 3rem));
	margin-bottom: var(--spacing--4xs);
}

.launcher {
	pointer-events: auto;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--instance-ai-launcher-size);
	height: var(--instance-ai-launcher-size);
	border: none;
	border-radius: var(--radius--full);
	cursor: pointer;
	color: var(--button--color--text--primary);
	background: var(--color--primary);
	box-shadow: var(--shadow--light);
	transition:
		transform 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		transform: scale(1.05);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 3px;
	}
}

/* Grown into a pill; the circle's height is kept so the dock doesn't jump. */
.launcherWithCta {
	width: auto;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);

	&:hover {
		transform: none;
	}
}

.launcherCta {
	position: relative;
	z-index: 1;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
}

.launcherOpen {
	background: var(--color--text);
}

.launcherWorking {
	/* Hover scale fights the working rings; keep the footprint stable. */
	&:hover {
		transform: none;
	}
}

.launcherIcon {
	color: inherit;
	position: relative;
	z-index: 1;
}

.workingRing {
	position: absolute;
	inset: 0;
	border-radius: inherit;
	border: 2px solid color-mix(in srgb, var(--color--primary) 70%, transparent);
	pointer-events: none;
	animation: launcherWorkingRing var(--duration--slowest) var(--easing--ease-out) infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
		opacity: 0.45;
		inset: calc(var(--spacing--4xs) * -1);
	}
}

.workingRingDelayed {
	animation-delay: calc(var(--duration--slowest) / 2);

	@media (prefers-reduced-motion: reduce) {
		display: none;
	}
}

@keyframes launcherWorkingRing {
	0% {
		transform: scale(1);
		opacity: 0.7;
	}

	100% {
		transform: scale(1.55);
		opacity: 0;
	}
}

.badge {
	position: absolute;
	top: 2px;
	right: 2px;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--color--danger);
	border: 2px solid var(--color--background--light-3);
}
</style>
