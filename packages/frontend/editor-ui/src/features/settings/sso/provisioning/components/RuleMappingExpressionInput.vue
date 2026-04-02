<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
	EditorView,
	keymap,
	placeholder as cmPlaceholder,
	ViewPlugin,
	type ViewUpdate,
	Decoration,
	type DecorationSet,
} from '@codemirror/view';
import { EditorState, type Range } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/commands';
import { parserWithMetaData as n8nParser } from '@n8n/codemirror-lang';
import { LanguageSupport, LRLanguage, syntaxTree } from '@codemirror/language';
import { parseMixed, type SyntaxNodeRef } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		placeholder?: string;
		disabled?: boolean;
	}>(),
	{
		placeholder: '',
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const editorRef = ref<HTMLDivElement>();
let editorView: EditorView | null = null;

// Standalone n8n expression language — syntax highlighting only, no completions
const isResolvable = (node: SyntaxNodeRef) => node.type.name === 'Resolvable';

const n8nParserWithNestedJs = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;
		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: isResolvable }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJs });

// Static decoration plugin: highlights {{ }} resolvable blocks using the parser tree
const resolvableDecoMark = Decoration.mark({ class: 'cm-resolvable-block' });
const bracketDecoMark = Decoration.mark({ class: 'cm-resolvable-bracket' });

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: Array<Range<Decoration>> = [];
	const tree = syntaxTree(view.state);

	tree.iterate({
		enter(node) {
			if (node.name === 'Resolvable') {
				// Highlight the full resolvable block
				decorations.push(resolvableDecoMark.range(node.from, node.to));
			}
			if (node.name === 'OpenMarker' || node.name === 'CloseMarker') {
				decorations.push(bracketDecoMark.range(node.from, node.to));
			}
		},
	});

	return Decoration.set(decorations, true);
}

const resolvableHighlightPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

function createExtensions() {
	return [
		new LanguageSupport(n8nLanguage),
		resolvableHighlightPlugin,
		history(),
		keymap.of(historyKeymap),
		EditorView.lineWrapping,
		EditorState.readOnly.of(props.disabled),
		EditorView.theme({
			'&': {
				fontSize: 'var(--font-size--2xs)',
				borderWidth: 'var(--border-width)',
				borderStyle: 'var(--border-style)',
				borderColor: 'var(--input--border-color, var(--border-color))',
				borderRadius: 'var(--radius)',
				backgroundColor: 'white',
				minHeight: '30px',
				width: '100%',
				padding: '0 0 0 var(--spacing--2xs)',
			},
			'&.cm-focused': {
				outline: '0 !important',
				borderColor: 'var(--color--foreground--shade-1, var(--input--border-color))',
			},
			'.cm-content': {
				fontFamily: 'var(--font-family--monospace)',
				color: 'var(--input--color--text, var(--color--text--shade-1))',
				caretColor: props.disabled ? 'transparent' : 'var(--code--caret--color)',
				padding: 'var(--spacing--4xs) 0',
			},
			'.cm-line': {
				padding: '0',
			},
			'.cm-scroller': {
				lineHeight: '1.68',
				overflow: 'auto',
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: 'var(--code--caret--color)',
			},
			'.cm-resolvable-block': {
				backgroundColor: 'var(--color--primary--tint-3)',
				borderRadius: '2px',
				padding: '0 1px',
			},
			'.cm-resolvable-bracket': {
				color: 'var(--color--text--tint-1)',
				fontWeight: '600',
			},
		}),
		...(props.placeholder ? [cmPlaceholder(props.placeholder)] : []),
		EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const newValue = update.state.doc.toString();
				if (newValue !== props.modelValue) {
					emit('update:modelValue', newValue);
				}
			}
		}),
	];
}

onMounted(() => {
	if (!editorRef.value) return;

	const state = EditorState.create({
		doc: props.modelValue,
		extensions: createExtensions(),
	});

	editorView = new EditorView({
		state,
		parent: editorRef.value,
	});
});

onBeforeUnmount(() => {
	editorView?.destroy();
	editorView = null;
});

// Sync external value changes into the editor
watch(
	() => props.modelValue,
	(newVal) => {
		if (!editorView) return;
		const currentVal = editorView.state.doc.toString();
		if (newVal !== currentVal) {
			editorView.dispatch({
				changes: { from: 0, to: editorView.state.doc.length, insert: newVal },
			});
		}
	},
);
</script>
<template>
	<div
		ref="editorRef"
		:class="[$style.container, { [$style.disabled]: disabled }]"
		data-test-id="rule-expression-input"
	/>
</template>
<style lang="scss" module>
.container {
	flex: 1;
	min-width: 0;

	:global(.cm-placeholder) {
		color: var(--color--text--tint-2);
		font-style: italic;
	}
}

.disabled {
	opacity: 0.6;
	pointer-events: none;
}
</style>
