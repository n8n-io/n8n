<script setup lang="ts">
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import {
	closeSearchPanel,
	highlightSelectionMatches,
	openSearchPanel,
	search,
	searchKeymap,
	searchPanelOpen,
} from '@codemirror/search';
import { Compartment, EditorState, Prec, Transaction, type Extension } from '@codemirror/state';
import {
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	type ViewUpdate,
} from '@codemirror/view';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import { DEBOUNCE_TIME } from '@/app/constants/durations';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { languageFacet } from '@/features/shared/editors/plugins/codemirror/format';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';

import type { WorkflowNodeRef } from '../workflowJson.types';
import { selectedNodeHighlight, setHighlightedRanges } from '../workflowJsonHighlight';
import { findWorkflowNodeRange, workflowNodeAtPos } from '../workflowJsonPaths';

const props = withDefaults(
	defineProps<{
		doc: string;
		editing: boolean;
		selectedNodes: WorkflowNodeRef[];
		editExtensions?: Extension[];
	}>(),
	{ editExtensions: () => [] },
);

const emit = defineEmits<{
	selectNodes: [nodes: WorkflowNodeRef[]];
	hoverNode: [node: WorkflowNodeRef | null];
	change: [doc: string];
}>();

const container = ref<HTMLDivElement>();
let view: EditorView | null = null;
const mode = new Compartment();
let hoveredKey: string | null = null;

const hoverHandlers = EditorView.domEventHandlers({
	mousemove(event, editorView) {
		const pos = editorView.posAtCoords({ x: event.clientX, y: event.clientY });
		const node = pos === null ? null : workflowNodeAtPos(editorView.state, pos);
		const key = nodeKey(node);
		if (key === hoveredKey) return;
		hoveredKey = key;
		emit('hoverNode', node);
	},
	mouseleave() {
		if (hoveredKey === null) return;
		hoveredKey = null;
		emit('hoverNode', null);
	},
});

function modeExtensions(editing: boolean): Extension {
	const theme = codeEditorTheme({ isReadOnly: !editing, minHeight: '100%', maxHeight: '100%' });
	if (!editing) return [theme, EditorState.readOnly.of(true)];
	return [
		theme,
		history(),
		closeBrackets(),
		indentOnInput(),
		highlightActiveLine(),
		highlightActiveLineGutter(),
		languageFacet.of('json'),
		Prec.highest(keymap.of(editorKeymap)),
		keymap.of(closeBracketsKeymap),
		...props.editExtensions,
	];
}

// A drag on the canvas changes only a few characters, so replace just those to keep cursor, scroll and folds.
function minimalChange(current: string, next: string) {
	let from = 0;
	const max = Math.min(current.length, next.length);
	while (from < max && current.charCodeAt(from) === next.charCodeAt(from)) from++;
	let currentEnd = current.length;
	let nextEnd = next.length;
	while (
		currentEnd > from &&
		nextEnd > from &&
		current.charCodeAt(currentEnd - 1) === next.charCodeAt(nextEnd - 1)
	) {
		currentEnd--;
		nextEnd--;
	}
	return { from, to: currentEnd, insert: next.slice(from, nextEnd) };
}

function nodeKey(node: WorkflowNodeRef | null) {
	return node ? (node.id ?? node.name ?? null) : null;
}

// True while a selection that the editor emitted travels through the canvas and comes back as a prop
let selectionFromEditor = false;
// The canvas can select a node before the debounced document contains it
let pendingScroll = false;

// CodeMirror rejects a dispatch inside an update listener, so the refresh runs later
const refreshHighlight = useDebounceFn(
	() => highlightSelection({ scroll: false }),
	getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
);

function onUpdate(update: ViewUpdate) {
	if (update.docChanged && props.editing) {
		emit('change', update.state.doc.toString());
		void refreshHighlight();
	}

	// Only the user's own cursor moves select on the canvas; our dispatches carry no user event
	if (!update.selectionSet || !update.transactions.some((tr) => tr.isUserEvent('select'))) return;

	const seen = new Set<string>();
	const nodes = update.state.selection.ranges
		.map((range) => workflowNodeAtPos(update.state, range.head))
		.filter((node): node is WorkflowNodeRef => node !== null)
		.filter((node) => {
			const key = nodeKey(node);
			if (key === null || seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	if (nodes.length === 0) return;
	selectionFromEditor = true;
	emit('selectNodes', nodes);
	// The canvas selects synchronously, so the prop watcher has run before this tick ends
	void nextTick(() => {
		selectionFromEditor = false;
	});
}

function highlightSelection({ scroll }: { scroll: boolean }) {
	if (!view) return;
	const { state } = view;
	const ranges = props.selectedNodes
		.map((node) => findWorkflowNodeRange(state, node))
		.filter((range) => range !== null);
	pendingScroll = scroll && ranges.length < props.selectedNodes.length;
	const target = scroll ? ranges[0] : undefined;

	view.dispatch({
		effects: target
			? [
					setHighlightedRanges.of(ranges),
					EditorView.scrollIntoView(target.from, { y: 'start', yMargin: 24 }),
				]
			: [setHighlightedRanges.of(ranges)],
		selection: target ? { anchor: target.from + 1 } : undefined,
	});
}

function replaceDoc(next: string, { addToHistory }: { addToHistory: boolean }) {
	if (!view) return;
	const current = view.state.doc.toString();
	if (current === next) return;
	view.dispatch({
		changes: minimalChange(current, next),
		annotations: Transaction.addToHistory.of(addToHistory),
	});
	highlightSelection({ scroll: pendingScroll });
}

onMounted(() => {
	if (!container.value) return;
	view = new EditorView({
		parent: container.value,
		state: EditorState.create({
			doc: props.doc,
			extensions: [
				json(),
				lineNumbers(),
				foldGutter(),
				bracketMatching(),
				highlightSelectionMatches({ minSelectionLength: 2 }),
				EditorView.lineWrapping,
				search({ top: true }),
				keymap.of([...searchKeymap, ...defaultKeymap]),
				selectedNodeHighlight(),
				mode.of(modeExtensions(props.editing)),
				EditorView.updateListener.of(onUpdate),
				hoverHandlers,
			],
		}),
	});
	highlightSelection({ scroll: true });
});

onBeforeUnmount(() => {
	view?.destroy();
	view = null;
});

watch(
	() => props.doc,
	(next) => {
		if (!props.editing) replaceDoc(next, { addToHistory: false });
	},
);

watch(
	() => props.editing,
	(editing) => {
		if (!view) return;
		const searchWasOpen = searchPanelOpen(view.state);
		view.dispatch({ effects: mode.reconfigure(modeExtensions(editing)) });
		// The search panel builds its replace row only on creation, and only when the editor is writable
		if (searchWasOpen) {
			closeSearchPanel(view);
			openSearchPanel(view);
		}
		if (editing) view.focus();
	},
);

watch(
	() => props.editExtensions,
	() => view?.dispatch({ effects: mode.reconfigure(modeExtensions(props.editing)) }),
);

watch(
	() => props.selectedNodes.map(nodeKey).join('\n'),
	() => highlightSelection({ scroll: !selectionFromEditor }),
);

defineExpose({
	getDoc: () => view?.state.doc.toString() ?? '',
	/** Replaces the document. In edit mode the change can be undone with Mod-z. */
	setDoc: (doc: string) => replaceDoc(doc, { addToHistory: props.editing }),
	openSearch: () => {
		if (!view) return;
		openSearchPanel(view);
	},
	focus: () => view?.focus(),
	revealNode: (node: WorkflowNodeRef) => {
		if (!view) return;
		const range = findWorkflowNodeRange(view.state, node);
		if (!range) return;
		view.dispatch({
			effects: EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 24 }),
			selection: { anchor: range.from + 1 },
		});
	},
});
</script>

<template>
	<div :class="$style.wrapper" data-test-id="workflow-json-editor">
		<div ref="container" :class="$style.editor" />
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.editor {
	flex: 1;
	min-height: 0;
	overflow: hidden;

	:global(.cm-editor) {
		height: 100%;
		border: none;
		border-radius: 0;
	}
}
</style>
