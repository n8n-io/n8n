<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLine,
	highlightSpecialChars,
} from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import {
	defaultKeymap,
	indentWithTab,
	history,
	historyKeymap,
	indentSelection,
} from '@codemirror/commands';
import {
	syntaxHighlighting,
	bracketMatching,
	indentOnInput,
	foldGutter,
	foldKeymap,
	HighlightStyle,
} from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		readonly?: boolean;
		errors?: Array<{ line?: number; message: string }>;
		language?: 'typescript' | 'json';
	}>(),
	{
		readonly: false,
		errors: () => [],
		language: 'typescript',
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const editorRef = ref<HTMLElement>();
let view: EditorView | undefined;

// Detect system theme
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = ref(prefersDark.matches);
prefersDark.addEventListener('change', (e) => {
	isDark.value = e.matches;
});

// Shared font config
const fontConfig = {
	fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
	fontSize: '13px',
	lineHeight: '1.6',
};

// Dark theme
const darkTheme = EditorView.theme(
	{
		'&': { backgroundColor: '#1e1e2e', color: '#cdd6f4', height: '100%' },
		'.cm-content': { caretColor: '#f5e0dc', ...fontConfig, padding: '4px 0' },
		'.cm-gutters': {
			backgroundColor: '#181825',
			color: '#585b70',
			border: 'none',
			minWidth: '48px',
		},
		'.cm-activeLineGutter': { backgroundColor: '#1e1e2e', color: '#a6adc8' },
		'.cm-activeLine': { backgroundColor: '#262637' },
		// Selection styling — ensure it renders above .cm-activeLine
		'.cm-selectionBackground': {
			backgroundColor: '#585b70 !important',
			zIndex: 1,
			position: 'relative',
		},
		'&.cm-focused .cm-selectionBackground': {
			backgroundColor: '#585b70 !important',
			zIndex: 1,
			position: 'relative',
		},
		// Native browser selection as fallback
		'&.cm-focused .cm-content ::selection': { backgroundColor: '#585b70 !important' },
		'.cm-content ::selection': { backgroundColor: '#585b70 !important' },
		'.cm-line ::selection': { backgroundColor: '#585b70 !important' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f5e0dc' },
		'.cm-matchingBracket': { backgroundColor: '#585b7040', outline: '1px solid #585b70' },
		'.cm-nonmatchingBracket': { backgroundColor: '#f38ba830' },
		'.cm-foldPlaceholder': { backgroundColor: '#313244', border: 'none', color: '#a6adc8' },
		'.cm-searchMatch': { backgroundColor: '#f9e2af30', outline: '1px solid #f9e2af50' },
		'.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#f9e2af50' },
		'.cm-selectionMatch': { backgroundColor: '#45475a40' },
		'.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px' },
		'.cm-foldGutter .cm-gutterElement': { padding: '0 4px', color: '#585b70' },
	},
	{ dark: true },
);

// Light theme
const lightTheme = EditorView.theme(
	{
		'&': { backgroundColor: '#ffffff', color: '#1a1a1a', height: '100%' },
		'.cm-content': { caretColor: '#1a1a1a', ...fontConfig, padding: '4px 0' },
		'.cm-gutters': { backgroundColor: '#f8f8f8', color: '#999', border: 'none', minWidth: '48px' },
		'.cm-activeLineGutter': { backgroundColor: '#f0f0f0', color: '#666' },
		'.cm-activeLine': { backgroundColor: '#f5f5f5' },
		// Selection styling — ensure it renders above .cm-activeLine
		'.cm-selectionBackground': {
			backgroundColor: '#b4c8e0 !important',
			zIndex: 1,
			position: 'relative',
		},
		'&.cm-focused .cm-selectionBackground': {
			backgroundColor: '#b4c8e0 !important',
			zIndex: 1,
			position: 'relative',
		},
		// Native browser selection as fallback
		'&.cm-focused .cm-content ::selection': { backgroundColor: '#b4c8e0 !important' },
		'.cm-content ::selection': { backgroundColor: '#b4c8e0 !important' },
		'.cm-line ::selection': { backgroundColor: '#b4c8e0 !important' },
		'.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1a1a1a' },
		'.cm-matchingBracket': { backgroundColor: '#c8e6c980', outline: '1px solid #a0d0a0' },
		'.cm-nonmatchingBracket': { backgroundColor: '#f5c2c240' },
		'.cm-foldPlaceholder': { backgroundColor: '#f0f0f0', border: '1px solid #ddd', color: '#999' },
		'.cm-searchMatch': { backgroundColor: '#fff3b030', outline: '1px solid #e6d45050' },
		'.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#fff3b060' },
		'.cm-selectionMatch': { backgroundColor: '#d0e8ff40' },
		'.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px' },
		'.cm-foldGutter .cm-gutterElement': { padding: '0 4px', color: '#ccc' },
	},
	{ dark: false },
);

// Dark syntax colors
const darkHighlightStyle = HighlightStyle.define([
	{ tag: tags.keyword, color: '#cba6f7' },
	{ tag: tags.operator, color: '#89dceb' },
	{ tag: tags.special(tags.variableName), color: '#f38ba8' },
	{ tag: tags.typeName, color: '#f9e2af' },
	{ tag: tags.atom, color: '#fab387' },
	{ tag: tags.number, color: '#fab387' },
	{ tag: tags.bool, color: '#fab387' },
	{ tag: tags.definition(tags.variableName), color: '#89b4fa' },
	{ tag: tags.string, color: '#a6e3a1' },
	{ tag: tags.special(tags.string), color: '#a6e3a1' },
	{ tag: tags.comment, color: '#6c7086', fontStyle: 'italic' },
	{ tag: tags.variableName, color: '#cdd6f4' },
	{ tag: tags.local(tags.variableName), color: '#cdd6f4' },
	{ tag: tags.function(tags.variableName), color: '#89b4fa' },
	{ tag: tags.function(tags.propertyName), color: '#89b4fa' },
	{ tag: tags.propertyName, color: '#89dceb' },
	{ tag: tags.className, color: '#f9e2af' },
	{ tag: tags.labelName, color: '#f38ba8' },
	{ tag: tags.namespace, color: '#f9e2af' },
	{ tag: tags.macroName, color: '#f38ba8' },
	{ tag: tags.literal, color: '#fab387' },
	{ tag: tags.separator, color: '#9399b2' },
	{ tag: tags.punctuation, color: '#9399b2' },
	{ tag: tags.tagName, color: '#f38ba8' },
	{ tag: tags.attributeName, color: '#f9e2af' },
	{ tag: tags.attributeValue, color: '#a6e3a1' },
	{ tag: tags.self, color: '#f38ba8' },
	{ tag: tags.regexp, color: '#f5c2e7' },
	{ tag: tags.link, color: '#89b4fa', textDecoration: 'underline' },
	{ tag: tags.escape, color: '#f5c2e7' },
	{ tag: tags.invalid, color: '#f38ba8', textDecoration: 'line-through' },
	{ tag: tags.meta, color: '#f9e2af' },
]);

// Light syntax colors
const lightHighlightStyle = HighlightStyle.define([
	{ tag: tags.keyword, color: '#7928a4' },
	{ tag: tags.operator, color: '#0068a8' },
	{ tag: tags.special(tags.variableName), color: '#c2185b' },
	{ tag: tags.typeName, color: '#8a6b00' },
	{ tag: tags.atom, color: '#c45100' },
	{ tag: tags.number, color: '#c45100' },
	{ tag: tags.bool, color: '#c45100' },
	{ tag: tags.definition(tags.variableName), color: '#1565c0' },
	{ tag: tags.string, color: '#2e7d32' },
	{ tag: tags.special(tags.string), color: '#2e7d32' },
	{ tag: tags.comment, color: '#8e8e8e', fontStyle: 'italic' },
	{ tag: tags.variableName, color: '#1a1a1a' },
	{ tag: tags.local(tags.variableName), color: '#1a1a1a' },
	{ tag: tags.function(tags.variableName), color: '#1565c0' },
	{ tag: tags.function(tags.propertyName), color: '#1565c0' },
	{ tag: tags.propertyName, color: '#0068a8' },
	{ tag: tags.className, color: '#8a6b00' },
	{ tag: tags.labelName, color: '#c2185b' },
	{ tag: tags.namespace, color: '#8a6b00' },
	{ tag: tags.macroName, color: '#c2185b' },
	{ tag: tags.literal, color: '#c45100' },
	{ tag: tags.separator, color: '#666' },
	{ tag: tags.punctuation, color: '#666' },
	{ tag: tags.tagName, color: '#c2185b' },
	{ tag: tags.attributeName, color: '#8a6b00' },
	{ tag: tags.attributeValue, color: '#2e7d32' },
	{ tag: tags.self, color: '#c2185b' },
	{ tag: tags.regexp, color: '#9c27b0' },
	{ tag: tags.link, color: '#1565c0', textDecoration: 'underline' },
	{ tag: tags.escape, color: '#9c27b0' },
	{ tag: tags.invalid, color: '#c2185b', textDecoration: 'line-through' },
	{ tag: tags.meta, color: '#8a6b00' },
]);

function createExtensions(): Extension[] {
	const extensions: Extension[] = [
		lineNumbers(),
		highlightActiveLine(),
		highlightSpecialChars(),
		history(),
		foldGutter(),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),
		highlightSelectionMatches(),
		props.language === 'json' ? json() : javascript({ typescript: true }),
		syntaxHighlighting(isDark.value ? darkHighlightStyle : lightHighlightStyle),
		isDark.value ? darkTheme : lightTheme,
		keymap.of([
			...closeBracketsKeymap,
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...foldKeymap,
			indentWithTab,
		]),
		EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				emit('update:modelValue', update.state.doc.toString());
			}
		}),
		EditorView.lineWrapping,
	];

	if (props.readonly) {
		extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
	}

	return extensions;
}

onMounted(() => {
	if (!editorRef.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc: props.modelValue,
			extensions: createExtensions(),
		}),
		parent: editorRef.value,
	});
});

onBeforeUnmount(() => {
	view?.destroy();
	view = undefined;
});

// Recreate editor when system theme changes
watch(isDark, () => {
	if (!view || !editorRef.value) return;
	const doc = view.state.doc.toString();
	view.destroy();
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: createExtensions(),
		}),
		parent: editorRef.value,
	});
});

// Sync external model changes into the editor
watch(
	() => props.modelValue,
	(newVal) => {
		if (!view) return;
		const currentVal = view.state.doc.toString();
		if (newVal !== currentVal) {
			view.dispatch({
				changes: { from: 0, to: currentVal.length, insert: newVal },
			});
		}
	},
);

// Recreate editor when readonly changes
watch(
	() => props.readonly,
	() => {
		if (!view || !editorRef.value) return;
		const doc = view.state.doc.toString();
		view.destroy();
		view = new EditorView({
			state: EditorState.create({
				doc,
				extensions: createExtensions(),
			}),
			parent: editorRef.value,
		});
	},
);

function format() {
	if (!view) return;
	// Select all text and re-indent using CodeMirror's built-in indentation
	view.dispatch({
		selection: { anchor: 0, head: view.state.doc.length },
	});
	indentSelection(view);
	// Collapse selection to end after formatting
	view.dispatch({
		selection: { anchor: view.state.doc.length },
	});
}

function scrollToPosition(pos: number) {
	if (!view) return;
	const clamped = Math.max(0, Math.min(pos, view.state.doc.length));
	const line = view.state.doc.lineAt(clamped);
	view.dispatch({
		selection: { anchor: line.from, head: line.to },
		effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
	});
	view.focus();
}

function highlightRange(from: number, to: number) {
	if (!view) return;
	const clampedFrom = Math.max(0, Math.min(from, view.state.doc.length));
	const clampedTo = Math.max(clampedFrom, Math.min(to, view.state.doc.length));
	view.dispatch({
		selection: { anchor: clampedFrom, head: clampedTo },
		effects: EditorView.scrollIntoView(clampedFrom, { y: 'center' }),
	});
	view.focus();
}

function scrollToLine(lineNumber: number) {
	if (!view) return;
	const clampedLine = Math.max(1, Math.min(lineNumber, view.state.doc.lines));
	const line = view.state.doc.line(clampedLine);
	view.dispatch({
		selection: { anchor: line.from, head: line.to },
		effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
	});
	view.focus();
}

defineExpose({ format, scrollToPosition, scrollToLine, highlightRange });
</script>

<template>
	<div ref="editorRef" :class="$style.editor" />
</template>

<style module>
.editor {
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.editor :global(.cm-editor) {
	height: 100%;
	outline: none;
}

.editor :global(.cm-scroller) {
	overflow: auto !important;
}

.editor :global(.cm-tooltip) {
	background: #313244;
	border: 1px solid #45475a;
	color: #cdd6f4;
	border-radius: 6px;
	font-size: 12px;
}

.editor :global(.cm-tooltip-autocomplete) {
	background: #313244;
}

.editor :global(.cm-tooltip-autocomplete > ul > li[aria-selected]) {
	background: #45475a;
}

.editor :global(.cm-panels) {
	background: #181825;
	color: #cdd6f4;
	border-color: #313244;
}

.editor :global(.cm-panels input) {
	background: #1e1e2e;
	color: #cdd6f4;
	border: 1px solid #45475a;
	border-radius: 4px;
	padding: 2px 6px;
	font-size: 13px;
	outline: none;
}

.editor :global(.cm-panels input:focus) {
	border-color: #89b4fa;
}

.editor :global(.cm-panels button) {
	background: #313244;
	color: #cdd6f4;
	border: 1px solid #45475a;
	border-radius: 4px;
	padding: 2px 8px;
	font-size: 12px;
	cursor: pointer;
}

.editor :global(.cm-panels button:hover) {
	background: #45475a;
}
</style>
