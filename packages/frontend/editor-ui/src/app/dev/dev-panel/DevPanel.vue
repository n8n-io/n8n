<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';

import PromptPopover from './PromptPopover.vue';
import { sendPrompt } from './channelClient';
import { collectElementContext } from './collectElementContext';
import {
	currentPagePath,
	currentViewport,
	formatAnnotationsForClipboard,
	type Annotation,
} from './formatPrompt';
import { DEV_PANEL_ROOT_ATTR, useElementPicker } from './useElementPicker';
import { useChannelHealth } from './useChannelHealth';

type TrackedAnnotation = Annotation & { element: Element };

const MARKER_SIZE = 22;

const { status } = useChannelHealth();
const { isPicking, hoveredElement, selectedElement, start, stop, clearSelection } =
	useElementPicker();
const sending = ref(false);
const annotations = shallowRef<TrackedAnnotation[]>([]);
const toast = ref<{ kind: 'info' | 'error'; message: string } | null>(null);
const rectVersion = ref(0);
const expanded = ref(false);
const editingId = ref<string | null>(null);

const editingPrompt = computed(() => {
	const id = editingId.value;
	if (!id) return '';
	return annotations.value.find((a) => a.id === id)?.prompt ?? '';
});

const channelAvailable = computed(() => status.value === 'connected');
const annotationCount = computed(() => annotations.value.length);
const hasAnnotations = computed(() => annotationCount.value > 0);

const fabTooltip = computed(() => {
	if (status.value === 'connected') return 'Open dev panel — channel connected';
	if (status.value === 'checking') return 'Open dev panel — checking channel';
	return 'Open dev panel — channel not running (clipboard still works)';
});

const hoverOverlayStyle = computed(() => {
	const el = hoveredElement.value;
	if (!el) return { display: 'none' };
	const rect = el.getBoundingClientRect();
	return {
		top: `${rect.top}px`,
		left: `${rect.left}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	};
});

type Marker = {
	id: string;
	index: number;
	top: number;
	left: number;
	annotation: TrackedAnnotation;
};

const markers = computed<Marker[]>(() => {
	void rectVersion.value;
	const result: Marker[] = [];
	annotations.value.forEach((annotation, idx) => {
		if (!annotation.element.isConnected) return;
		const rect = annotation.element.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return;
		result.push({
			id: annotation.id,
			index: idx + 1,
			top: rect.top + rect.height / 2 - MARKER_SIZE / 2,
			left: rect.left + rect.width / 2 - MARKER_SIZE / 2,
			annotation,
		});
	});
	return result;
});

function bumpRects() {
	rectVersion.value += 1;
}

let frameId: number | null = null;
function scheduleBump() {
	if (frameId !== null) return;
	frameId = requestAnimationFrame(() => {
		frameId = null;
		bumpRects();
	});
}

onMounted(() => {
	window.addEventListener('scroll', scheduleBump, true);
	window.addEventListener('resize', scheduleBump);
});

onUnmounted(() => {
	window.removeEventListener('scroll', scheduleBump, true);
	window.removeEventListener('resize', scheduleBump);
	if (frameId !== null) cancelAnimationFrame(frameId);
});

function showToast(kind: 'info' | 'error', message: string) {
	toast.value = { kind, message };
	setTimeout(() => {
		toast.value = null;
	}, 3000);
}

function generateId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function expandPanel() {
	expanded.value = true;
	toast.value = null;
	clearSelection();
	start();
}

function collapsePanel() {
	expanded.value = false;
	stop();
	clearSelection();
}

function togglePicking() {
	if (isPicking.value) {
		stop();
	} else {
		clearSelection();
		start();
	}
}

async function handleSend(prompt: string) {
	const anchor = selectedElement.value;
	if (!anchor) return;

	sending.value = true;
	try {
		await sendPrompt({ prompt, ...collectElementContext(anchor) });
		showToast('info', 'Sent to Claude');
		clearSelection();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to send';
		showToast('error', message);
	} finally {
		sending.value = false;
	}
}

function handleAdd(prompt: string) {
	const anchor = selectedElement.value;
	if (!anchor) return;

	const id = editingId.value;
	if (id) {
		annotations.value = annotations.value.map((a) =>
			a.id === id ? { ...a, prompt, context: collectElementContext(anchor), element: anchor } : a,
		);
		editingId.value = null;
		clearSelection();
		bumpRects();
		start();
		return;
	}

	annotations.value = [
		...annotations.value,
		{ id: generateId(), prompt, context: collectElementContext(anchor), element: anchor },
	];
	clearSelection();
	bumpRects();
	start();
}

function handleCancel() {
	editingId.value = null;
	clearSelection();
	if (expanded.value) start();
}

function startEditing(annotation: TrackedAnnotation) {
	stop();
	editingId.value = annotation.id;
	selectedElement.value = annotation.element;
}

function clearAnnotations() {
	annotations.value = [];
}

async function copyAllAnnotations() {
	if (annotations.value.length === 0) return;
	const text = formatAnnotationsForClipboard({
		pagePath: currentPagePath(),
		viewport: currentViewport(),
		annotations: annotations.value.map(({ element: _element, ...rest }) => rest),
	});
	try {
		await navigator.clipboard.writeText(text);
		const n = annotations.value.length;
		showToast('info', `Copied ${n} annotation${n === 1 ? '' : 's'} to clipboard`);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Copy failed';
		showToast('error', message);
	}
}
</script>

<template>
	<div :[DEV_PANEL_ROOT_ATTR]="true" class="dev-panel-root">
		<div v-if="isPicking" class="dev-panel-hover-overlay" :style="hoverOverlayStyle" />

		<template v-if="expanded">
			<button
				v-for="marker in markers"
				:key="marker.id"
				type="button"
				class="dev-panel-marker"
				:style="{ top: `${marker.top}px`, left: `${marker.left}px` }"
				:title="`Edit: ${marker.annotation.prompt}`"
				@click.stop="startEditing(marker.annotation)"
			>
				<span class="dev-panel-marker-number">{{ marker.index }}</span>
				<svg
					class="dev-panel-marker-pen"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 20h9" />
					<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
				</svg>
			</button>
		</template>

		<PromptPopover
			v-if="selectedElement"
			:anchor="selectedElement"
			:sending="sending"
			:channel-available="channelAvailable"
			:initial-prompt="editingPrompt"
			:is-editing="!!editingId"
			@send="handleSend"
			@add="handleAdd"
			@cancel="handleCancel"
		/>

		<div v-if="toast" class="dev-panel-toast" :class="`dev-panel-toast--${toast.kind}`">
			{{ toast.message }}
		</div>

		<div class="dev-panel-dock">
			<button
				v-if="!expanded"
				type="button"
				class="dev-panel-fab"
				:title="fabTooltip"
				@click="expandPanel"
			>
				<svg
					class="dev-panel-fab-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="4" y1="8" x2="14" y2="8" />
					<line x1="4" y1="14" x2="10" y2="14" />
					<path d="M17 13l1.5 3 3 1.5-3 1.5L17 22l-1.5-3-3-1.5 3-1.5z" fill="currentColor" />
				</svg>
				<span
					class="dev-panel-fab-status"
					:class="`dev-panel-fab-status--${status}`"
					aria-hidden="true"
				/>
				<span v-if="hasAnnotations" class="dev-panel-fab-badge">{{ annotationCount }}</span>
			</button>

			<div v-else class="dev-panel-toolbar" role="toolbar" aria-label="Dev panel">
				<button
					type="button"
					class="dev-panel-toolbar-button"
					:class="{ 'dev-panel-toolbar-button--active': isPicking }"
					:title="isPicking ? 'Stop picking (Esc)' : 'Pick an element'"
					@click="togglePicking"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="8" />
						<line x1="12" y1="2" x2="12" y2="5" />
						<line x1="12" y1="19" x2="12" y2="22" />
						<line x1="2" y1="12" x2="5" y2="12" />
						<line x1="19" y1="12" x2="22" y2="12" />
						<circle cx="12" cy="12" r="1.5" fill="currentColor" />
					</svg>
				</button>
				<button
					type="button"
					class="dev-panel-toolbar-button"
					:disabled="!hasAnnotations"
					title="Copy all annotations as markdown"
					@click="copyAllAnnotations"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<rect x="9" y="9" width="11" height="11" rx="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					<span v-if="hasAnnotations" class="dev-panel-toolbar-badge">{{ annotationCount }}</span>
				</button>
				<button
					type="button"
					class="dev-panel-toolbar-button"
					:disabled="!hasAnnotations"
					title="Clear annotations"
					@click="clearAnnotations"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
				<span class="dev-panel-toolbar-divider" aria-hidden="true" />
				<button
					type="button"
					class="dev-panel-toolbar-button"
					title="Close dev panel"
					@click="collapsePanel"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<line x1="6" y1="6" x2="18" y2="18" />
						<line x1="18" y1="6" x2="6" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.dev-panel-root {
	position: fixed;
	z-index: 2147483645;
	inset: 0;
	pointer-events: none;
	font-family: var(--font-family);
}

.dev-panel-root > * {
	pointer-events: auto;
}

.dev-panel-hover-overlay {
	position: fixed;
	pointer-events: none;
	background: rgb(80 130 255 / 15%);
	border: 2px solid var(--color--primary);
	border-radius: var(--radius--sm);
	transition: all 40ms linear;
}

.dev-panel-marker {
	position: fixed;
	z-index: 2147483644;
	width: 22px;
	height: 22px;
	padding: 0;
	border-radius: 50%;
	background: #2563eb;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	font-family: inherit;
	line-height: 1;
	box-shadow: 0 2px 6px rgb(0 0 0 / 30%);
	border: 2px solid #fff;
	cursor: pointer;
	user-select: none;
	transition: transform 80ms ease;
}

.dev-panel-marker:hover {
	transform: scale(1.1);
}

.dev-panel-marker-pen {
	display: none;
	width: 12px;
	height: 12px;
}

.dev-panel-marker:hover .dev-panel-marker-number {
	display: none;
}

.dev-panel-marker:hover .dev-panel-marker-pen {
	display: block;
}

.dev-panel-toast {
	position: fixed;
	right: var(--spacing--sm);
	bottom: 72px;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	box-shadow: 0 4px 16px rgb(0 0 0 / 20%);
}

.dev-panel-toast--info {
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
	border: var(--border-width) var(--border-style) var(--color--success);
}

.dev-panel-toast--error {
	background: var(--color--danger--tint-4);
	color: var(--color--danger--shade-1);
	border: var(--border-width) var(--border-style) var(--color--danger);
}

.dev-panel-dock {
	position: fixed;
	right: var(--spacing--sm);
	bottom: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	align-items: flex-end;
	max-width: min(420px, calc(100vw - var(--spacing--md)));
}

.dev-panel-fab {
	position: relative;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: #1a1a1a;
	color: #fff;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6px 20px rgb(0 0 0 / 30%);
	transition: transform 120ms ease;
}

.dev-panel-fab:hover {
	transform: translateY(-1px);
}

.dev-panel-fab-icon {
	width: 22px;
	height: 22px;
}

.dev-panel-fab-badge {
	position: absolute;
	top: -4px;
	right: -6px;
	min-width: 22px;
	height: 22px;
	padding: 0 6px;
	border-radius: 11px;
	background: #2563eb;
	color: #fff;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #1a1a1a;
	box-sizing: border-box;
}

.dev-panel-fab-status {
	position: absolute;
	bottom: 2px;
	right: 2px;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: var(--color--text--tint-3);
	border: 2px solid #1a1a1a;
	box-sizing: border-box;
}

.dev-panel-fab-status--connected {
	background: var(--color--success);
}

.dev-panel-fab-status--disconnected {
	background: var(--color--danger);
}

.dev-panel-fab-status--checking {
	background: var(--color--warning);
}

.dev-panel-toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs);
	background: #1a1a1a;
	border-radius: 999px;
	box-shadow: 0 6px 20px rgb(0 0 0 / 30%);
}

.dev-panel-toolbar-button {
	position: relative;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: transparent;
	color: #fff;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dev-panel-toolbar-button svg {
	width: 18px;
	height: 18px;
}

.dev-panel-toolbar-button:hover:not(:disabled) {
	background: rgb(255 255 255 / 10%);
}

.dev-panel-toolbar-button:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}

.dev-panel-toolbar-button--active {
	background: #2563eb;
}

.dev-panel-toolbar-button--active:hover:not(:disabled) {
	background: #1d4ed8;
}

.dev-panel-toolbar-badge {
	position: absolute;
	top: 0;
	right: 0;
	min-width: 16px;
	height: 16px;
	padding: 0 4px;
	border-radius: 8px;
	background: #2563eb;
	color: #fff;
	font-size: 10px;
	font-weight: var(--font-weight--bold);
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #1a1a1a;
	box-sizing: border-box;
}

.dev-panel-toolbar-divider {
	width: 1px;
	height: 20px;
	background: rgb(255 255 255 / 20%);
	margin: 0 var(--spacing--5xs);
}
</style>
