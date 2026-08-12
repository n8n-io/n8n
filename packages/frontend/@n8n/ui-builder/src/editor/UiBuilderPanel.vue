<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nIcon,
	N8nIconButton,
	N8nResizeWrapper,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, toRef } from 'vue';

import { writeState } from '../core/binding';
import type { UiActionStep, UiNode, UiScope, UiWebhookStep } from '../core/types';
import { getComponentDef } from '../kit';
import { createScopeRegistry, UiScopeRegistryKey } from '../renderer/scope-registry';
import UiRenderer from '../renderer/UiRenderer.vue';
import { useActionPreview } from './composables/useActionPreview';
import { useOutline } from './composables/useOutline';
import { usePages } from './composables/usePages';
import { useUiBuilderLayout } from './composables/useUiBuilderLayout';
import { useUiDocument } from './composables/useUiDocument';
import { useWebhookTargets } from './composables/useWebhookTargets';
import type { WebhookTarget } from './composables/useWebhookTargets';
import { UiTooltipParentKey, type UiBuilderHost } from './host';
import InspectorPane from './panes/InspectorPane.vue';
import OutlinePane from './panes/OutlinePane.vue';
import PagesPane from './panes/PagesPane.vue';
import PalettePane from './panes/PalettePane.vue';
import TriggerPickerDialog from './panes/TriggerPickerDialog.vue';

/**
 * The authoring surface: palette, pages, outline, live canvas, and a property
 * inspector driven by each component's descriptors. Five panes do not fit a
 * parameter column, so the parameter itself is a button and this opens in a
 * viewport-sized dialog.
 *
 * Everything it knows how to do lives in this package. Everything it cannot do
 * for itself, because it belongs to the workflow editor, arrives through the
 * host interface.
 */
defineOptions({ name: 'UiBuilderPanel' });

const props = defineProps<{
	/** The document, as the JSON string a node parameter holds, or already parsed. */
	value: string | object | undefined;
	host: UiBuilderHost;
	readOnly?: boolean;
}>();

const emit = defineEmits<{ update: [definition: UiNode] }>();

const open = ref(false);
const readOnly = computed(() => Boolean(props.readOnly));

/**
 * Preview strips the canvas down to what `UiRenderer` renders for the running
 * app: no selection outline, no hover, no click-to-select. Toggled rather than
 * a separate view, so it stays the same document and the same scroll position.
 */
const previewMode = ref(false);

const {
	doc,
	selectedId,
	selectedRegion,
	hoveredId,
	selected,
	selectedPseudo,
	inspectorProps,
	palette,
	paletteCount,
	componentCount,
	summary,
	commit,
	setProp,
	selectNode,
	selectRegion,
	addComponent,
	deleteSelected,
	deleteNode,
	moveNode,
} = useUiDocument(toRef(props, 'value'), (definition) => emit('update', definition), readOnly);

const {
	pages,
	editingPage,
	defaultPage,
	renamingId,
	addPage,
	removePage,
	makeDefault,
	renamePage,
	selectPage,
} = usePages(doc, commit, selectedId, readOnly);

const { outlineRows, indentOf, toggleCollapsed } = useOutline(
	doc,
	computed(() => editingPage.value?.id),
);

const {
	paletteWidth,
	pagesOutlineWidth,
	inspectorWidth,
	paletteBounds,
	pagesOutlineBounds,
	inspectorBounds,
	onPaletteResize,
	onPagesOutlineResize,
	onInspectorResize,
} = useUiBuilderLayout();

const {
	localTargets,
	targetFor,
	labelFor,
	loadEligible,
	pickerOpen,
	pickerQuery,
	pickerLoading,
	pickerResults,
	pickExternal,
	pickTarget,
} = useWebhookTargets(props.host);

// Expressions in the canvas resolve against an empty scope, so a bound prop
// renders blank rather than showing its raw source. `$loading` is present and
// empty rather than missing: an expression naming a key of something undefined
// throws, and the prop would resolve to undefined instead of falsy.
const canvasState = reactive<{
	$state: Record<string, unknown>;
	$loading: Record<string, boolean>;
}>({ $state: {}, $loading: {} });

/**
 * An input on the canvas fills the canvas state, exactly as it would fill the
 * running app's. It is the only way to put a form's own values there — a reply
 * cannot — and without them a request body reading `{{ $state.form }}` has
 * nothing to preview and the inspector shows the expression as unresolved.
 */
function writeCanvasState(path: string, value: unknown) {
	writeState(canvasState.$state, path, value);
}

const { previewStatus, responses, runAction, runChain, loadLastExecution } = useActionPreview(
	props.host,
	canvasState.$state,
	targetFor,
	loadEligible,
);

/**
 * The scope the canvas renders in. `$route` names the page being edited rather
 * than one a browser is on, which is the one thing the canvas has to decide
 * that the running app does not.
 */
const canvasScope = computed<UiScope>(() => ({
	$state: canvasState.$state,
	$loading: canvasState.$loading,
	$pages: pages.value,
	$route: editingPage.value
		? { path: editingPage.value.path, params: {}, pageId: editingPage.value.id }
		: undefined,
}));

const scopeRegistry = createScopeRegistry();
provide(UiScopeRegistryKey, scopeRegistry);
provide(UiTooltipParentKey, () => props.host.tooltipContainer?.());

/**
 * What the inspector previews and completes against: the scope the selected
 * node is actually being rendered with, which carries `$item` and `$index` when
 * it sits inside a repeat. Falls back to the page scope before the canvas has
 * rendered it.
 */
const inspectorScope = computed<UiScope>(
	() => scopeRegistry.scopeFor(selectedId.value) ?? canvasScope.value,
);

/** The selected component's descriptor, for the small selection panel above the inspector. */
const selectedDef = computed(() =>
	selected.value ? getComponentDef(selected.value.type) : undefined,
);

/**
 * The real production URL of the Webhook that serves this page, when the host
 * can pin one down unambiguously — see `UiBuilderHost.liveWebhookUrl`. Read
 * fresh on click rather than cached, since it also depends on the workflow's
 * saved connections, which the host is better placed to track than this pane.
 */
const liveWebhookUrl = computed(() => props.host.liveWebhookUrl());

const liveWebhookTooltip = computed(() => {
	if (liveWebhookUrl.value) return 'Open the live webhook URL in a new tab';
	if (!props.host.workflowActive()) return 'Activate the workflow to get a live URL';
	return 'No single GET Webhook trigger serving this page could be found';
});

function openLiveWebhook() {
	if (!liveWebhookUrl.value) return;
	window.open(liveWebhookUrl.value, '_blank', 'noopener');
}

/**
 * `button` + `onClick` gives `buttonOnClick`, then `buttonOnClick2`. The host
 * makes the pair; naming it after what points at it is this pane's business.
 */
async function createTrigger(propName: string): Promise<WebhookTarget | undefined> {
	if (!selected.value) return undefined;

	const type = selected.value.type;
	const base = `${type}${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
	const taken = new Set(props.host.localEndpoints().map((endpoint) => endpoint.path));

	let path = base;
	let n = 2;
	while (taken.has(path)) path = `${base}${n++}`;

	const made = await props.host.createWebhookPair(path);
	// The host makes the pair as a POST, which is what a step wanting a body needs.
	return made ? { label: path, url: props.host.webhookUrlFor(path), method: 'POST' } : undefined;
}

/**
 * Typing into the inspector must keep its own Backspace and Escape, so a key
 * pressed inside a text field is never a command to the builder.
 */
function isTextEntry(target: EventTarget | null): boolean {
	return Boolean((target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]'));
}

/**
 * Listening on the document rather than on the dialog's own markup: selecting
 * in the canvas clicks a plain element, which leaves focus on the dialog
 * itself, so a handler on any pane would never see the key.
 */
function onKeydown(event: KeyboardEvent) {
	if (!open.value || readOnly.value || previewMode.value || !selectedId.value) return;
	// The picker sits on top of the builder, so Delete there is aimed at it.
	if (pickerOpen.value || renamingId.value) return;
	if (isTextEntry(event.target)) return;
	if (event.key !== 'Delete' && event.key !== 'Backspace') return;

	event.preventDefault();
	deleteSelected();
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

/**
 * Escape closes the dialog, which is the wrong thing to do while a component is
 * selected: dropping the selection is the smaller step, and a second Escape
 * still closes.
 */
function onEscape(event: KeyboardEvent) {
	if ((!selectedId.value && !selectedRegion.value) || isTextEntry(event.target)) return;

	event.preventDefault();
	selectNode(undefined);
}
</script>

<template>
	<div class="ui-builder-trigger">
		<N8nButton variant="outline" size="small" @click="open = true">Open builder</N8nButton>
		<N8nText size="small" color="text-light">{{ summary }}</N8nText>
	</div>

	<N8nDialog
		:open="open"
		size="cover"
		aria-label="UI Builder"
		@update:open="open = $event"
		@escape-key-down="onEscape"
	>
		<div class="ui-builder">
			<header class="ui-builder__header">
				<div class="ui-builder__header-content">
					<N8nIcon icon="layout-template" size="medium" class="ui-builder__header-icon" />
					<div class="ui-builder__header-title">
						<N8nText size="small">UI Builder</N8nText>
					</div>
				</div>

				<div class="ui-builder__header-actions">
					<N8nTooltip content="Docs aren't wired up yet">
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="book-open"
							aria-label="Documentation (not yet available)"
							disabled
						/>
					</N8nTooltip>

					<N8nTooltip :content="previewMode ? 'Back to editing' : 'Preview without editing chrome'">
						<N8nIconButton
							variant="ghost"
							size="small"
							:icon="previewMode ? 'eye-off' : 'eye'"
							:aria-label="previewMode ? 'Back to editing' : 'Preview without editing chrome'"
							@click="previewMode = !previewMode"
						/>
					</N8nTooltip>

					<N8nTooltip :content="liveWebhookTooltip">
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="external-link"
							:aria-label="liveWebhookTooltip"
							:disabled="!liveWebhookUrl"
							@click="openLiveWebhook"
						/>
					</N8nTooltip>

					<N8nTooltip content="Delete the selected component">
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="trash-2"
							aria-label="Delete the selected component"
							:disabled="readOnly || previewMode || !selectedId || selectedId === doc.id"
							@click="deleteSelected"
						/>
					</N8nTooltip>
				</div>
			</header>

			<div class="ui-builder__layout">
				<N8nResizeWrapper
					class="ui-builder__resizer"
					:width="paletteWidth"
					:min-width="paletteBounds.min"
					:max-width="paletteBounds.max"
					:grid-size="1"
					:supported-directions="['right']"
					:style="{ width: `${paletteWidth}px` }"
					@resize="onPaletteResize"
				>
					<PalettePane
						:sections="palette"
						:count="paletteCount"
						:disabled="readOnly"
						@add="addComponent"
					/>
				</N8nResizeWrapper>

				<!--
					Pages above the outline: picking one changes what the outline below
					is showing, so the two read as one column doing that.
				-->
				<N8nResizeWrapper
					class="ui-builder__resizer"
					:width="pagesOutlineWidth"
					:min-width="pagesOutlineBounds.min"
					:max-width="pagesOutlineBounds.max"
					:grid-size="1"
					:supported-directions="['right']"
					:style="{ width: `${pagesOutlineWidth}px` }"
					@resize="onPagesOutlineResize"
				>
					<div class="ui-builder__column">
						<PagesPane
							class="ui-builder__pages"
							:pages="pages"
							:current-id="editingPage?.id"
							:default-id="defaultPage?.id"
							:renaming-id="renamingId"
							:disabled="readOnly"
							@add="addPage"
							@select="selectPage"
							@remove="removePage"
							@make-default="makeDefault"
							@rename="renamePage"
							@update:renaming-id="renamingId = $event"
						/>

						<OutlinePane
							class="ui-builder__outline"
							:rows="outlineRows"
							:count="componentCount"
							:selected-id="selectedId"
							:selected-region="selectedRegion"
							:disabled="readOnly"
							:indent-of="indentOf"
							@select="selectNode"
							@select-region="selectRegion"
							@move="moveNode"
							@remove="deleteNode"
							@toggle-collapsed="toggleCollapsed"
						/>
					</div>
				</N8nResizeWrapper>

				<section class="ui-builder__canvas">
					<div class="ui-builder__surface">
						<UiRenderer
							:node="doc"
							:scope="canvasScope"
							:edit="!previewMode"
							:selected-id="selectedId"
							:hovered-id="hoveredId"
							:on-select="selectNode"
							:on-hover="(id?: string) => (hoveredId = id)"
							:on-write="writeCanvasState"
						/>
					</div>
				</section>

				<N8nResizeWrapper
					class="ui-builder__resizer"
					:width="inspectorWidth"
					:min-width="inspectorBounds.min"
					:max-width="inspectorBounds.max"
					:grid-size="1"
					:supported-directions="['left']"
					:style="{ width: `${inspectorWidth}px` }"
					@resize="onInspectorResize"
				>
					<div class="ui-builder__column">
						<!--
							The top bar is generic, panel-level actions only (see the header
							above); what is actually selected lives here instead, right next
							to the properties it describes.
						-->
						<div class="ui-builder__selection">
							<N8nText size="small" color="text-light">
								{{ editingPage ? editingPage.title || editingPage.path : 'No page selected' }}
							</N8nText>
							<template v-if="selected">
								<N8nText size="small" color="text-light">/</N8nText>
								<N8nIcon
									v-if="selectedDef?.icon"
									:icon="selectedDef.icon"
									size="small"
									class="ui-builder__selection-icon"
								/>
								<N8nText size="small" bold color="text-dark">
									{{ selectedDef?.label ?? selected.type }}
								</N8nText>
							</template>
							<template v-else-if="selectedPseudo">
								<N8nText size="small" color="text-light">/</N8nText>
								<N8nText size="small" bold color="text-dark">{{ selectedPseudo.label }}</N8nText>
							</template>
						</div>

						<InspectorPane
							class="ui-builder__inspector"
							:node="selected"
							:pseudo="selectedPseudo"
							:descriptors="inspectorProps"
							:pages="pages"
							:targets="localTargets"
							:scope="inspectorScope"
							:responses="responses"
							:disabled="readOnly"
							:label-for="labelFor"
							:browse="pickExternal"
							:create-trigger="createTrigger"
							:run="(step: UiWebhookStep, after: UiActionStep[]) => void runAction(step, after)"
							:history="
								(step: UiWebhookStep, after: UiActionStep[]) => void loadLastExecution(step, after)
							"
							:run-all="(steps: UiActionStep[]) => void runChain(steps)"
							:preview-status="previewStatus"
							@set-prop="setProp"
						/>
					</div>
				</N8nResizeWrapper>
			</div>
		</div>
	</N8nDialog>

	<TriggerPickerDialog
		:open="pickerOpen"
		:query="pickerQuery"
		:loading="pickerLoading"
		:results="pickerResults"
		@update:open="pickerOpen = $event"
		@update:query="pickerQuery = $event"
		@pick="pickTarget"
	/>
</template>

<style scoped>
.ui-builder-trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.ui-builder {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	height: 100%;
	max-height: 100%;
	min-height: 0;
	overflow: hidden;
}

/*
 * The same structure as the NDV's own `NDVHeader.vue`: an icon and a title on
 * the left (`.content`/`.title` there), generic panel actions on the right
 * (`.actions`), so the two authoring surfaces read as the same family. This
 * bar is panel-level only — what is actually selected lives in
 * `.ui-builder__selection` instead, next to the properties it describes.
 * `padding-right` carries what the removed `N8nDialogHeader` used to: it
 * clears the dialog's absolutely positioned close button.
 */
.ui-builder__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	padding: var(--spacing--4xs);
	padding-right: var(--spacing--xl);
	background: var(--color--background--light-3);
}

.ui-builder__header-content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: var(--spacing--2xs);
	min-width: 0;
}

.ui-builder__header-icon {
	align-self: center;
}

.ui-builder__header-title {
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
}

.ui-builder__header-actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

/* One divider per control, matching `NDVHeader`'s `.actions` treatment. */
.ui-builder__header-actions > *:not(:last-child) {
	border-right: var(--border);
	padding-right: var(--spacing--2xs);
}

/*
 * The selection breadcrumb that used to sit in the top bar: the page being
 * edited, and the component selected within it. A slim row, not a full pane
 * (`PaneShell` is for panes with their own scrollable body), sitting directly
 * above the properties it describes.
 */
.ui-builder__selection {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
	min-width: 0;
}

.ui-builder__selection-icon {
	color: var(--color--text--tint-1);
}

.ui-builder__layout {
	flex: 1;
	min-height: 0;
	display: flex;
	/*
	 * A plain flex row: each resizable column carries its own pixel width
	 * (from `useUiBuilderLayout`), the canvas fills whatever is left. Flex's
	 * default `align-items: stretch` gives every column the row's full height,
	 * same as grid did before.
	 */
	gap: var(--spacing--2xs);
	overflow: hidden;
}

/*
 * Sized entirely by its own inline `width` (bound to a resizable column's
 * width ref) — never grows or shrinks on its own. `:deep` reaches into
 * `PaneShell`'s root so the pane actually fills the height this wrapper
 * gets from the flex row, instead of shrinking to its content. The pages
 * pane opts out (see `.ui-builder__pages` below): it sizes to its own
 * content instead of stretching.
 */
.ui-builder__resizer {
	flex: 0 0 auto;
	min-height: 0;
}

.ui-builder__resizer :deep(.ui-pane):not(.ui-builder__pages) {
	height: 100%;
}

/*
 * `N8nResizeWrapper`'s own drag handle (`[data-test-id="resize-handle"]`) is
 * an invisible hit-area by design — a cursor swap, nothing painted. Scoped
 * here rather than in the shared component, so this doesn't change the
 * handle everywhere it's used (e.g. the NDV's own panel resize): a thin line
 * appears only on hover, so a column boundary reads as draggable instead of
 * as a hairline gap between two bordered panes.
 */
.ui-builder__resizer :deep([data-test-id='resize-handle']) {
	background: var(--color--primary);
	opacity: 0;
	transition: opacity 80ms ease;
}

.ui-builder__resizer:hover :deep([data-test-id='resize-handle']) {
	opacity: 1;
}

.ui-builder__column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	height: 100%;
	min-height: 0;
}

/*
 * Hugs the page list instead of stretching: with one or two pages, the
 * outline below gets the room. `max-height` caps it at roughly six rows
 * plus the header before it scrolls internally (via `PaneShell`'s
 * `.ui-pane__body`) rather than pushing the outline further down.
 */
.ui-builder__pages {
	flex: 0 0 auto;
	max-height: calc(var(--height--sm) + 6 * var(--height--xl));
}

/* Grows to absorb whatever height the content-sized pages pane leaves it. */
.ui-builder__outline {
	flex: 1 1 auto;
	min-height: 0;
}

/* Grows to absorb whatever height the content-sized selection row leaves it. */
.ui-builder__inspector {
	flex: 1 1 auto;
	min-height: 0;
}

.ui-builder__canvas {
	display: flex;
	flex-direction: column;
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
}

.ui-builder__surface {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: var(--spacing--xs);
}
</style>
