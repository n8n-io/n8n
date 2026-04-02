<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

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

/**
 * The backend stores expressions with {{ }} wrappers (n8n expression format).
 * The UI shows only the inner JS expression — wrappers are added/removed automatically.
 */
function stripWrappers(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
		return trimmed.slice(2, -2).trim();
	}
	return trimmed;
}

function addWrappers(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';
	if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
		return trimmed;
	}
	return `{{ ${trimmed} }}`;
}

function createExtensions() {
	return [
		javascript(),
		syntaxHighlighting(defaultHighlightStyle),
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
		}),
		...(props.placeholder ? [cmPlaceholder(props.placeholder)] : []),
		EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const rawValue = update.state.doc.toString();
				const wrapped = addWrappers(rawValue);
				if (wrapped !== props.modelValue) {
					emit('update:modelValue', wrapped);
				}
			}
		}),
	];
}

onMounted(() => {
	if (!editorRef.value) return;

	const state = EditorState.create({
		doc: stripWrappers(props.modelValue),
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
		const stripped = stripWrappers(newVal);
		const currentVal = editorView.state.doc.toString();
		if (stripped !== currentVal) {
			editorView.dispatch({
				changes: { from: 0, to: editorView.state.doc.length, insert: stripped },
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
