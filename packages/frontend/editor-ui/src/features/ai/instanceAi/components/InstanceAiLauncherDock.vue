<script setup lang="ts">
/**
 * SPIKE (INS-1154) — Intercom-style dock: launcher circle bottom-right,
 * proactive offer bubble stacked above it, floating panel opens from here.
 */
import { computed, useTemplateRef } from 'vue';
import { useStorage } from '@vueuse/core';
import { N8nFloatingWindow, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useLogsStore } from '@/app/stores/logs.store';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { useInstanceAiProactiveOffer } from '../composables/useInstanceAiProactiveOffer';
import { useInstanceAiPanelStore } from '../instanceAiPanel.store';
import InstanceAiFloatingChatBody from './InstanceAiFloatingChatBody.vue';
import InstanceAiOfferBubble from './InstanceAiOfferBubble.vue';

const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 820;
/** Inset from the viewport edges — keeps clear of corner chrome / logs. */
const EDGE_INSET = 24;
const LAUNCHER_SIZE = 52;
const DOCK_GAP = 12;
const STORAGE_KEY = 'n8n-instance-ai-floating-panel-spike-v6';

const i18n = useI18n();
const panelStore = useInstanceAiPanelStore();
const logsStore = useLogsStore();
const instanceAiAvailable = useInstanceAiAvailable();
const { activeOffer, accept, dismiss } = useInstanceAiProactiveOffer();
const floatingWindowRef =
	useTemplateRef<InstanceType<typeof N8nFloatingWindow>>('floatingWindowRef');

const showDock = computed(() => instanceAiAvailable.value);
const isOpen = computed(() => panelStore.isOpen);
const threadId = computed(() => panelStore.activeThreadId);
const showOfferBubble = computed(() => Boolean(activeOffer.value) && !isOpen.value);

/** Sit above the logs panel when it's open. */
const dockBottomOffset = computed(() => logsStore.height + EDGE_INSET);
const dockRightOffset = EDGE_INSET;

const anchorStyle = computed(() => ({
	right: `${dockRightOffset}px`,
	bottom: `${dockBottomOffset.value}px`,
}));

/** Space reserved under the panel for the launcher stack + logs. */
const launcherStack = computed(() => LAUNCHER_SIZE + dockBottomOffset.value + DOCK_GAP);

const floatingWindowState = useStorage<{
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}>(STORAGE_KEY, {});

function defaultPosition(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
	return {
		x: Math.max(EDGE_INSET, window.innerWidth - width - dockRightOffset),
		y: Math.max(EDGE_INSET, window.innerHeight - height - launcherStack.value),
	};
}

const floatingWindowPosition = computed(() => {
	if (floatingWindowState.value.x !== undefined && floatingWindowState.value.y !== undefined) {
		return { x: floatingWindowState.value.x, y: floatingWindowState.value.y };
	}
	return defaultPosition();
});

const floatingWindowWidth = computed(() => floatingWindowState.value.width ?? DEFAULT_WIDTH);
const floatingWindowHeight = computed(() => floatingWindowState.value.height ?? DEFAULT_HEIGHT);

function onMove(pos: { x: number; y: number }) {
	floatingWindowState.value = { ...floatingWindowState.value, x: pos.x, y: pos.y };
}

function onResize(size: { width: number; height: number }) {
	floatingWindowState.value = {
		...floatingWindowState.value,
		width: size.width,
		height: size.height,
	};
}

function onResetPosition() {
	floatingWindowState.value = {};
	floatingWindowRef.value?.resetPosition(defaultPosition(), {
		width: DEFAULT_WIDTH,
		height: DEFAULT_HEIGHT,
	});
}

function onExpand() {
	void panelStore.expandToFullView();
}

async function onAcceptOffer() {
	await accept();
}

function onLauncherClick() {
	if (showOfferBubble.value) {
		void onAcceptOffer();
		return;
	}
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
			:min-width="400"
			:min-height="300"
			:initial-position="floatingWindowPosition"
			data-test-id="instance-ai-floating-panel-spike"
			@close="panelStore.close()"
			@move="onMove"
			@resize="onResize"
			@header-double-click="onResetPosition"
		>
			<template #header>
				<N8nText size="medium" :bold="true" :class="$style.headerTitle">
					{{ i18n.baseText('aiAssistant.name') }}
				</N8nText>
			</template>
			<template #header-actions>
				<N8nIconButton
					v-if="threadId"
					icon="maximize-2"
					variant="ghost"
					size="medium"
					title="Open full view"
					data-test-id="instance-ai-floating-panel-expand"
					@click="onExpand"
				/>
			</template>

			<InstanceAiFloatingChatBody v-if="threadId" :key="threadId" :thread-id="threadId" />
			<div v-else :class="$style.empty">
				<N8nText color="text-light" size="small">Starting conversation…</N8nText>
			</div>
		</N8nFloatingWindow>

		<div :class="$style.anchor" :style="anchorStyle">
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
				:class="[$style.launcher, { [$style.launcherOpen]: isOpen }]"
				:aria-label="i18n.baseText('aiAssistant.name')"
				:aria-expanded="isOpen"
				data-test-id="instance-ai-launcher-button"
				@click="onLauncherClick"
			>
				<span v-if="showOfferBubble" :class="$style.badge" aria-hidden="true" />
				<N8nIcon :icon="isOpen ? 'x' : 'sparkles'" size="large" :class="$style.launcherIcon" />
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
	width: min(20rem, calc(100vw - 3rem));
	margin-bottom: var(--spacing--5xs);
}

.launcher {
	pointer-events: auto;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border: none;
	border-radius: 50%;
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

.launcherOpen {
	background: var(--color--text);
}

.launcherIcon {
	color: inherit;
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
