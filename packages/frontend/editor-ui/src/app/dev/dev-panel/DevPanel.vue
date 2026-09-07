<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

import router from '@/app/router';
import FlagPanel from './FlagPanel.vue';
import PromptPopover from './PromptPopover.vue';
import { loadAnnotations, resolveElementForContext, saveAnnotations } from './annotationStorage';
import { collectElementContext } from './collectElementContext';
import {
	currentPagePath,
	currentViewport,
	formatAnnotationsForClipboard,
	type Annotation,
} from './formatPrompt';
import { DEV_PANEL_ROOT_ATTR, useElementPicker } from './useElementPicker';

type TrackedAnnotation = Annotation & { elements: Element[] };

const MARKER_SIZE = 22;
const VISIBILITY_STORAGE_KEY = 'n8n-dev-panel:visible';

function loadVisibility(): boolean {
	try {
		return window.localStorage.getItem(VISIBILITY_STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function saveVisibility(value: boolean) {
	try {
		window.localStorage.setItem(VISIBILITY_STORAGE_KEY, value ? '1' : '0');
	} catch {
		// ignore
	}
}

const { isPicking, hoveredElement, selectedElement, dragRect, start, stop, clearSelection } =
	useElementPicker();
const visible = ref(loadVisibility());
const annotations = shallowRef<TrackedAnnotation[]>([]);
const pendingMulti = shallowRef<Element[]>([]);
const toast = ref<{ kind: 'error'; message: string } | null>(null);
const justCopied = ref(false);
let copiedResetTimer: ReturnType<typeof setTimeout> | null = null;
const rectVersion = ref(0);
const expanded = ref(false);
const flagsOpen = ref(false);
const editingId = ref<string | null>(null);
const currentPath = ref(window.location.pathname);

const editingPrompt = computed(() => {
	const id = editingId.value;
	if (!id) return '';
	return annotations.value.find((a) => a.id === id)?.prompt ?? '';
});

const annotationCount = computed(() => annotations.value.length);
const hasAnnotations = computed(() => annotationCount.value > 0);

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
	isMulti: boolean;
};

const markers = computed<Marker[]>(() => {
	void rectVersion.value;
	const result: Marker[] = [];
	annotations.value.forEach((annotation, idx) => {
		const isMulti = annotation.contexts.length > 1;
		annotation.contexts.forEach((context, ctxIdx) => {
			let viewportTop: number;
			let viewportLeft: number;
			let width: number;
			let height: number;

			const live = annotation.elements[ctxIdx];
			if (live?.isConnected) {
				const r = live.getBoundingClientRect();
				if (r.width === 0 || r.height === 0) return;
				viewportTop = r.top;
				viewportLeft = r.left;
				width = r.width;
				height = r.height;
			} else {
				const bbox = context.bbox;
				if (!bbox) return;
				if (bbox.width === 0 || bbox.height === 0) return;
				viewportTop = bbox.isFixed ? bbox.y : bbox.y - window.scrollY;
				viewportLeft = bbox.isFixed ? bbox.x : bbox.x - window.scrollX;
				width = bbox.width;
				height = bbox.height;
			}

			result.push({
				id: `${annotation.id}-${ctxIdx}`,
				index: idx + 1,
				top: viewportTop + height / 2 - MARKER_SIZE / 2,
				left: viewportLeft + width / 2 - MARKER_SIZE / 2,
				annotation,
				isMulti,
			});
		});
	});
	return result;
});

type PendingOutline = { top: number; left: number; width: number; height: number };

const pendingOutlines = computed<PendingOutline[]>(() => {
	void rectVersion.value;
	const result: PendingOutline[] = [];
	for (const el of pendingMulti.value) {
		if (!el.isConnected) continue;
		const rect = el.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) continue;
		result.push({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
	}
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

watch(selectedElement, (el) => {
	if (!el) return;
	if (!pendingMulti.value.includes(el)) {
		pendingMulti.value = [];
	}
});

function handleShiftKeyUp(event: KeyboardEvent) {
	if (event.key !== 'Shift') return;
	if (!isPicking.value) return;
	if (pendingMulti.value.length === 0) return;
	commitPendingMulti();
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	return target.isContentEditable;
}

function handleToggleShortcut(event: KeyboardEvent) {
	if (!event.ctrlKey || !event.shiftKey) return;
	if (event.key.toLowerCase() !== 'd') return;
	if (isEditableTarget(event.target)) return;
	event.preventDefault();
	visible.value = !visible.value;
	if (!visible.value) {
		expanded.value = false;
		flagsOpen.value = false;
		stop();
		clearSelection();
		pendingMulti.value = [];
		editingId.value = null;
	}
}

function loadForPath(path: string) {
	const stored = loadAnnotations(path);
	annotations.value = stored.map((a) => ({
		...a,
		elements: a.contexts
			.map((c) => resolveElementForContext(c))
			.filter((el): el is Element => el !== null),
	}));
	editingId.value = null;
	bumpRects();
}

function reresolveIfNeeded() {
	let changed = false;
	const next = annotations.value.map((a) => {
		const fullyConnected =
			a.elements.length === a.contexts.length && a.elements.every((el) => el.isConnected);
		if (fullyConnected) return a;
		const resolved = a.contexts
			.map((c) => resolveElementForContext(c))
			.filter((el): el is Element => el !== null);
		const unchanged =
			resolved.length === a.elements.length && resolved.every((el, i) => el === a.elements[i]);
		if (unchanged) return a;
		changed = true;
		return { ...a, elements: resolved };
	});
	if (changed) {
		annotations.value = next;
		bumpRects();
	}
}

let resolveFrameId: number | null = null;
function scheduleReresolve() {
	if (resolveFrameId !== null) return;
	resolveFrameId = requestAnimationFrame(() => {
		resolveFrameId = null;
		reresolveIfNeeded();
	});
}

let activeCleanup: (() => void) | null = null;

function activateObservers() {
	if (activeCleanup) return;

	window.addEventListener('scroll', scheduleBump, true);
	window.addEventListener('resize', scheduleBump);
	window.addEventListener('keyup', handleShiftKeyUp, true);

	const unsubscribeRouter = router.afterEach((to) => {
		currentPath.value = to.path;
	});

	const observer = new MutationObserver(scheduleReresolve);
	observer.observe(document.body, { childList: true, subtree: true });

	const livePath = router.currentRoute.value.path;
	if (livePath === currentPath.value) {
		loadForPath(livePath);
	} else {
		currentPath.value = livePath;
	}

	activeCleanup = () => {
		window.removeEventListener('scroll', scheduleBump, true);
		window.removeEventListener('resize', scheduleBump);
		window.removeEventListener('keyup', handleShiftKeyUp, true);
		unsubscribeRouter();
		observer.disconnect();
	};
}

function deactivateObservers() {
	activeCleanup?.();
	activeCleanup = null;
}

onMounted(() => {
	window.addEventListener('keydown', handleToggleShortcut, true);
	if (visible.value) activateObservers();
});

onUnmounted(() => {
	window.removeEventListener('keydown', handleToggleShortcut, true);
	deactivateObservers();
	if (frameId !== null) cancelAnimationFrame(frameId);
	if (resolveFrameId !== null) cancelAnimationFrame(resolveFrameId);
});

watch(visible, (v) => {
	if (v) activateObservers();
	else deactivateObservers();
	saveVisibility(v);
});

watch(currentPath, (newPath, oldPath) => {
	if (newPath === oldPath) return;
	loadForPath(newPath);
});

watch(annotations, (current) => {
	const serializable = current.map(({ elements: _elements, ...rest }) => rest);
	saveAnnotations(currentPath.value, serializable);
});

function showErrorToast(message: string) {
	toast.value = { kind: 'error', message };
	setTimeout(() => {
		toast.value = null;
	}, 3000);
}

function generateId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function startPicker() {
	start({ onShiftPick: handleShiftPick, onDragSelect: handleDragSelect });
}

function handleDragSelect(els: Element[]) {
	if (els.length === 0) return;
	pendingMulti.value = els;
	commitPendingMulti();
}

function handleShiftPick(el: Element) {
	const current = pendingMulti.value;
	const idx = current.indexOf(el);
	if (idx >= 0) {
		pendingMulti.value = [...current.slice(0, idx), ...current.slice(idx + 1)];
	} else {
		pendingMulti.value = [...current, el];
	}
	bumpRects();
}

function commitPendingMulti() {
	const pending = pendingMulti.value;
	if (pending.length === 0) return;
	stop();
	selectedElement.value = pending[0];
}

function expandPanel() {
	expanded.value = true;
	toast.value = null;
	clearSelection();
	pendingMulti.value = [];
	startPicker();
}

function collapsePanel() {
	expanded.value = false;
	flagsOpen.value = false;
	stop();
	clearSelection();
	pendingMulti.value = [];
}

function toggleFlags() {
	flagsOpen.value = !flagsOpen.value;
}

watch(flagsOpen, (open) => {
	if (open) {
		stop();
		clearSelection();
		pendingMulti.value = [];
	} else if (expanded.value) {
		startPicker();
	}
});

function togglePicking() {
	if (isPicking.value) {
		stop();
	} else {
		clearSelection();
		pendingMulti.value = [];
		startPicker();
	}
}

function currentTargets(): Element[] {
	if (pendingMulti.value.length > 0) return pendingMulti.value;
	const anchor = selectedElement.value;
	return anchor ? [anchor] : [];
}

function handleAdd(prompt: string) {
	const targets = currentTargets();
	if (targets.length === 0) return;

	const contexts = targets.map((el) => collectElementContext(el));

	const id = editingId.value;
	if (id) {
		annotations.value = annotations.value.map((a) =>
			a.id === id ? { ...a, prompt, contexts, elements: targets } : a,
		);
		editingId.value = null;
		clearSelection();
		pendingMulti.value = [];
		bumpRects();
		startPicker();
		return;
	}

	annotations.value = [
		...annotations.value,
		{ id: generateId(), prompt, contexts, elements: targets },
	];
	clearSelection();
	pendingMulti.value = [];
	bumpRects();
	startPicker();
}

function handleCancel() {
	editingId.value = null;
	clearSelection();
	pendingMulti.value = [];
	if (expanded.value) startPicker();
}

function startEditing(annotation: TrackedAnnotation) {
	stop();
	editingId.value = annotation.id;
	pendingMulti.value = annotation.elements.length > 1 ? [...annotation.elements] : [];
	selectedElement.value = annotation.elements[0] ?? null;
}

function clearAnnotations() {
	annotations.value = [];
}

async function copyAllAnnotations() {
	if (annotations.value.length === 0) return;
	const text = formatAnnotationsForClipboard({
		pagePath: currentPagePath(),
		viewport: currentViewport(),
		annotations: annotations.value.map(({ elements: _elements, ...rest }) => rest),
	});
	try {
		await navigator.clipboard.writeText(text);
		justCopied.value = true;
		if (copiedResetTimer) clearTimeout(copiedResetTimer);
		copiedResetTimer = setTimeout(() => {
			justCopied.value = false;
			copiedResetTimer = null;
		}, 1500);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Copy failed';
		showErrorToast(message);
	}
}
</script>

<template>
	<div v-if="visible" :[DEV_PANEL_ROOT_ATTR]="true" class="dev-panel-root">
		<div v-if="isPicking && !dragRect" class="dev-panel-hover-overlay" :style="hoverOverlayStyle" />

		<div
			v-if="dragRect"
			class="dev-panel-drag-rect"
			:style="{
				top: `${dragRect.y}px`,
				left: `${dragRect.x}px`,
				width: `${dragRect.width}px`,
				height: `${dragRect.height}px`,
			}"
		/>

		<div
			v-for="(outline, idx) in pendingOutlines"
			:key="`pending-${idx}`"
			class="dev-panel-pending-outline"
			:style="{
				top: `${outline.top}px`,
				left: `${outline.left}px`,
				width: `${outline.width}px`,
				height: `${outline.height}px`,
			}"
		/>

		<template v-if="expanded">
			<button
				v-for="marker in markers"
				:key="marker.id"
				type="button"
				class="dev-panel-marker"
				:class="{ 'dev-panel-marker--multi': marker.isMulti }"
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
			:initial-prompt="editingPrompt"
			:is-editing="!!editingId"
			@add="handleAdd"
			@cancel="handleCancel"
		/>

		<div v-if="toast" class="dev-panel-toast dev-panel-toast--error">
			{{ toast.message }}
		</div>

		<FlagPanel v-if="expanded && flagsOpen" @close="flagsOpen = false" />

		<div class="dev-panel-dock">
			<button
				v-if="!expanded"
				type="button"
				class="dev-panel-fab"
				title="Open dev panel"
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
				<span v-if="hasAnnotations" class="dev-panel-fab-badge">{{ annotationCount }}</span>
			</button>

			<div v-else class="dev-panel-toolbar" role="toolbar" aria-label="Dev panel">
				<button
					type="button"
					class="dev-panel-toolbar-button"
					:class="{ 'dev-panel-toolbar-button--active': isPicking }"
					:title="
						isPicking
							? 'Stop picking (Esc) — Shift+click to multi-select'
							: 'Pick an element (Shift+click to multi-select)'
					"
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
					:class="{ 'dev-panel-toolbar-button--active': flagsOpen }"
					:title="flagsOpen ? 'Close feature flags' : 'Feature flag overrides'"
					@click="toggleFlags"
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
						<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
						<line x1="4" y1="22" x2="4" y2="15" />
					</svg>
				</button>
				<button
					type="button"
					class="dev-panel-toolbar-button"
					:class="{ 'dev-panel-toolbar-button--success': justCopied }"
					:disabled="!hasAnnotations"
					:title="justCopied ? 'Copied!' : 'Copy all annotations as markdown'"
					@click="copyAllAnnotations"
				>
					<Transition name="dev-panel-icon-swap" mode="out-in">
						<svg
							v-if="justCopied"
							key="check"
							class="dev-panel-toolbar-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<polyline points="5 12 10 17 19 7" />
						</svg>
						<svg
							v-else
							key="copy"
							class="dev-panel-toolbar-icon"
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
					</Transition>
					<Transition name="dev-panel-badge-fade">
						<span v-if="hasAnnotations && !justCopied" class="dev-panel-toolbar-badge">
							{{ annotationCount }}
						</span>
					</Transition>
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
	background: color-mix(in srgb, var(--color--blue-500) 15%, transparent);
	border: 2px solid var(--color--blue-500);
	border-radius: var(--radius--sm);
	transition: all 40ms linear;
}

.dev-panel-pending-outline {
	position: fixed;
	pointer-events: none;
	background: color-mix(in srgb, var(--color--primary) 12%, transparent);
	border: 2px dashed var(--color--primary);
	border-radius: var(--radius--sm);
	z-index: 2147483643;
}

.dev-panel-drag-rect {
	position: fixed;
	pointer-events: none;
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	border: 1px solid var(--color--success);
	border-radius: var(--radius--sm);
	z-index: 2147483645;
}

.dev-panel-marker {
	position: fixed;
	z-index: 2147483644;
	width: 22px;
	height: 22px;
	padding: 0;
	border-radius: 50%;
	background: var(--color--primary);
	color: var(--color--background);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	font-family: inherit;
	line-height: 1;
	box-shadow: 0 2px 6px var(--color--black-alpha-400);
	border: 2px solid var(--color--background);
	cursor: pointer;
	user-select: none;
	transition: transform 80ms ease;
}

.dev-panel-marker:hover {
	transform: scale(1.1);
}

.dev-panel-marker--multi {
	background: var(--color--success);
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
	box-shadow: 0 4px 16px var(--color--black-alpha-300);
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
	background: var(--color--neutral-900);
	color: var(--color--neutral-50);
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6px 20px var(--color--black-alpha-400);
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
	background: var(--color--blue-500);
	color: var(--color--neutral-50);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid var(--color--neutral-900);
	box-sizing: border-box;
}

.dev-panel-toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs);
	background: var(--color--neutral-900);
	border-radius: 999px;
	box-shadow: 0 6px 20px var(--color--black-alpha-400);
}

.dev-panel-toolbar-button {
	position: relative;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: transparent;
	color: var(--color--neutral-50);
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition:
		background-color 180ms ease,
		color 180ms ease;
}

.dev-panel-toolbar-button svg {
	width: 18px;
	height: 18px;
}

.dev-panel-toolbar-icon {
	transform-origin: center;
}

.dev-panel-icon-swap-enter-active,
.dev-panel-icon-swap-leave-active {
	transition:
		opacity 160ms ease,
		transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dev-panel-icon-swap-enter-from {
	opacity: 0;
	transform: scale(0.5) rotate(-15deg);
}

.dev-panel-icon-swap-leave-to {
	opacity: 0;
	transform: scale(0.5) rotate(15deg);
}

.dev-panel-badge-fade-enter-active,
.dev-panel-badge-fade-leave-active {
	transition:
		opacity 160ms ease,
		transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.dev-panel-badge-fade-enter-from,
.dev-panel-badge-fade-leave-to {
	opacity: 0;
	transform: scale(0.6);
}

.dev-panel-toolbar-button:hover:not(:disabled) {
	background: color-mix(in srgb, var(--color--neutral-50) 10%, transparent);
}

.dev-panel-toolbar-button:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}

.dev-panel-toolbar-button--active {
	background: var(--color--blue-500);
}

.dev-panel-toolbar-button--active:hover:not(:disabled) {
	background: var(--color--blue-600);
}

.dev-panel-toolbar-button--success,
.dev-panel-toolbar-button--success:hover:not(:disabled) {
	background: var(--color--success);
	color: var(--color--neutral-50);
}

.dev-panel-toolbar-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	min-width: 20px;
	height: 20px;
	padding: 0 5px;
	border-radius: 10px;
	background: var(--color--blue-500);
	color: var(--color--neutral-50);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid var(--color--neutral-900);
	box-sizing: border-box;
}

.dev-panel-toolbar-divider {
	width: 1px;
	height: 20px;
	background: color-mix(in srgb, var(--color--neutral-50) 20%, transparent);
	margin: 0 var(--spacing--5xs);
}
</style>
