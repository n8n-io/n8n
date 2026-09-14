<script setup lang="ts">
import { history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { foldGutter, indentOnInput } from '@codemirror/language';
import type { Diagnostic } from '@codemirror/lint';
import { linter, lintGutter } from '@codemirror/lint';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { useI18n } from '@n8n/i18n';
import { v4 as uuidv4 } from 'uuid';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { useAppTypescript } from '@/features/shared/editors/plugins/codemirror/typescript/client/useAppTypescript';

const props = withDefaults(
	defineProps<{ modelValue: string; isReadOnly?: boolean; components?: string | null }>(),
	{ isReadOnly: false, components: null },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const i18n = useI18n();
const id = uuidv4();

// Warns on likely secrets: not a substitute for the server's own guard, just
// an early nudge before an author pastes a key into source that renders as-is.
const SECRET_LITERAL_PATTERN =
	/(sk|pk|key|token|secret)[-_][A-Za-z0-9]{16,}|\b[A-Za-z0-9+/]{32,}={0,2}\b/i;

const secretLintSource = (view: EditorView): Diagnostic[] => {
	const diagnostics: Diagnostic[] = [];
	const text = view.state.doc.toString();
	const pattern = new RegExp(SECRET_LITERAL_PATTERN, 'gi');
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(text)) !== null) {
		diagnostics.push({
			from: match.index,
			to: match.index + match[0].length,
			severity: 'warning',
			message: i18n.baseText('apps.block.code.secretLiteral.warning'),
		});
	}
	return diagnostics;
};

const editorRef = ref<HTMLDivElement>();
const editor = ref<EditorView>();
const tsCompartment = new Compartment();

const { createWorker } = useAppTypescript(editor, id, () => props.components);

async function createEditor() {
	const initialExtensions: Extension[] = [
		lineNumbers(),
		EditorView.lineWrapping,
		EditorState.readOnly.of(props.isReadOnly),
		codeEditorTheme({ isReadOnly: props.isReadOnly, maxHeight: '100%', minHeight: '240px' }),
		tsCompartment.of(javascript({ typescript: true, jsx: true })),
	];

	if (!props.isReadOnly) {
		initialExtensions.push(
			history(),
			keymap.of(editorKeymap),
			lintGutter(),
			linter(secretLintSource),
			indentOnInput(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			foldGutter(),
			dropCursor(),
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (!update.docChanged) return;
				emit('update:modelValue', update.state.doc.toString());
			}),
		);
	}

	editor.value = new EditorView({
		parent: editorRef.value,
		state: EditorState.create({ doc: props.modelValue, extensions: initialExtensions }),
	});

	if (!props.isReadOnly) {
		const tsExtension = await createWorker();
		editor.value.dispatch({ effects: tsCompartment.reconfigure(tsExtension) });
	}
}

onMounted(createEditor);
onBeforeUnmount(() => editor.value?.destroy());

watch(
	() => props.modelValue,
	(next) => {
		const current = editor.value?.state.doc.toString();
		if (current === undefined || current === next) return;
		editor.value?.dispatch({ changes: { from: 0, to: current.length, insert: next } });
	},
);
</script>

<template>
	<div :class="$style.editor" data-test-id="app-code-editor">
		<div ref="editorRef" :class="$style.inner" />
	</div>
</template>

<style lang="scss" module>
.editor {
	width: 100%;
	min-height: 240px;
}

.inner {
	height: 100%;

	& > div {
		height: 100%;
	}
}
</style>
