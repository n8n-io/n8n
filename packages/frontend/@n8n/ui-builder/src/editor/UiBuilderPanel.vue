<script setup lang="ts">
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, toRef } from 'vue';

import type { UiScope } from '../core/types';
import { createScopeRegistry, UiScopeRegistryKey } from '../renderer/scope-registry';
import UiRenderer from '../renderer/UiRenderer.vue';
import { useActionPreview } from './composables/useActionPreview';
import { useOutline } from './composables/useOutline';
import { usePages } from './composables/usePages';
import { useUiDocument } from './composables/useUiDocument';
import { useWebhookTargets } from './composables/useWebhookTargets';
import type { UiBuilderHost } from './host';
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

const emit = defineEmits<{ update: [json: string] }>();

const open = ref(false);
const readOnly = computed(() => Boolean(props.readOnly));

const {
	doc,
	selectedId,
	hoveredId,
	selected,
	selectedRegions,
	targetRegion,
	inspectorProps,
	palette,
	paletteCount,
	componentCount,
	summary,
	commit,
	setProp,
	addComponent,
	deleteSelected,
	deleteNode,
	moveNode,
} = useUiDocument(toRef(props, 'value'), (json) => emit('update', json), readOnly);

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

const { outlineRows, indentOf } = useOutline(doc);

const {
	localTargets,
	targetForUrl,
	labelForUrl,
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

const { previewStatus, runAction, loadLastExecution } = useActionPreview(
	props.host,
	canvasState.$state,
	targetForUrl,
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

/**
 * What the inspector previews and completes against: the scope the selected
 * node is actually being rendered with, which carries `$item` and `$index` when
 * it sits inside a repeat. Falls back to the page scope before the canvas has
 * rendered it.
 */
const inspectorScope = computed<UiScope>(
	() => scopeRegistry.scopeFor(selectedId.value) ?? canvasScope.value,
);

/**
 * `button` + `onClick` gives `buttonOnClick`, then `buttonOnClick2`. The host
 * makes the pair; naming it after what points at it is this pane's business.
 */
async function createTrigger(propName: string): Promise<string | undefined> {
	if (!selected.value) return undefined;

	const type = selected.value.type;
	const base = `${type}${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
	const taken = new Set(props.host.localWebhookPaths());

	let path = base;
	let n = 2;
	while (taken.has(path)) path = `${base}${n++}`;

	const made = await props.host.createWebhookPair(path);
	return made ? props.host.webhookUrlFor(path) : undefined;
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
	if (!open.value || readOnly.value || !selectedId.value) return;
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
	if (!selectedId.value || isTextEntry(event.target)) return;

	event.preventDefault();
	selectedId.value = undefined;
}
</script>

<template>
	<div class="ui-builder-trigger">
		<N8nButton variant="outline" size="small" @click="open = true">Open builder</N8nButton>
		<N8nText size="small" color="text-light">{{ summary }}</N8nText>
	</div>

	<N8nDialog :open="open" size="cover" @update:open="open = $event" @escape-key-down="onEscape">
		<div class="ui-builder">
			<N8nDialogHeader class="ui-builder__header">
				<N8nDialogTitle>UI Builder</N8nDialogTitle>
				<N8nDialogDescription>
					Click a component in the canvas or the outline to select it. The palette inserts after the
					selection.
				</N8nDialogDescription>
			</N8nDialogHeader>

			<div class="ui-builder__layout">
				<PalettePane
					:sections="palette"
					:count="paletteCount"
					:disabled="readOnly"
					@add="addComponent"
				/>

				<!--
					Pages above the outline: picking one changes what the outline below
					is showing, so the two read as one column doing that.
				-->
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
						:rows="outlineRows"
						:count="componentCount"
						:selected-id="selectedId"
						:disabled="readOnly"
						:indent-of="indentOf"
						@select="selectedId = $event"
						@move="moveNode"
						@remove="deleteNode"
					/>
				</div>

				<section class="ui-builder__canvas">
					<div class="ui-builder__toolbar">
						<N8nText size="small" color="text-light">
							{{ selected ? `${selected.type} · ${selected.id}` : 'Nothing selected' }}
						</N8nText>

						<!-- Which page is on screen, since the canvas shows one at a time. -->
						<N8nText v-if="editingPage" size="small" color="text-light">
							{{ editingPage.title || editingPage.path }}
						</N8nText>

						<N8nText v-if="previewStatus" size="small" color="text-light">
							preview: {{ previewStatus }}
						</N8nText>

						<N8nTooltip content="Delete the selected component">
							<N8nIconButton
								variant="ghost"
								size="small"
								icon="trash-2"
								aria-label="Delete the selected component"
								:disabled="readOnly || !selectedId || selectedId === doc.id"
								@click="deleteSelected"
							/>
						</N8nTooltip>
					</div>

					<div class="ui-builder__surface">
						<UiRenderer
							:node="doc"
							:scope="canvasScope"
							:edit="true"
							:selected-id="selectedId"
							:hovered-id="hoveredId"
							:on-select="(id: string) => (selectedId = id)"
							:on-hover="(id?: string) => (hoveredId = id)"
						/>
					</div>
				</section>

				<InspectorPane
					:node="selected"
					:descriptors="inspectorProps"
					:regions="selectedRegions"
					:target-region="targetRegion"
					:pages="pages"
					:targets="localTargets"
					:scope="inspectorScope"
					:disabled="readOnly"
					:label-for="labelForUrl"
					:browse="pickExternal"
					:create-trigger="createTrigger"
					:run="(url: string) => void runAction(url)"
					:history="(url: string) => void loadLastExecution(url)"
					@set-prop="setProp"
					@update:target-region="targetRegion = $event"
				/>
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
	gap: var(--spacing--xs);
	height: 100%;
	max-height: 100%;
	min-height: 0;
	overflow: hidden;
}

.ui-builder__header {
	flex-shrink: 0;
	/* Clear the dialog's absolutely positioned close button. */
	padding-right: var(--spacing--xl);
}

.ui-builder__layout {
	flex: 1;
	min-height: 0;
	display: grid;
	/*
	 * `minmax(0, …)` on both axes: without it the row is `auto` and the panes
	 * grow to fit their content instead of scrolling inside themselves.
	 */
	grid-template-columns: 200px 220px minmax(0, 1fr) 320px;
	grid-template-rows: minmax(0, 1fr);
	gap: var(--spacing--xs);
	overflow: hidden;
}

.ui-builder__column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
}

/*
 * Grows with the list and then stops: enough for a handful of pages without
 * squeezing the outline below it out of the column.
 */
.ui-builder__pages {
	flex: 0 1 auto;
	max-height: 40%;
}

.ui-builder__canvas {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
}

.ui-builder__toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
	background: var(--color--foreground--tint-2);
}

.ui-builder__surface {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: var(--spacing--sm);
}
</style>
