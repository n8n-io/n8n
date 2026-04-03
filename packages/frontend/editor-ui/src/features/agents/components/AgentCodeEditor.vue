<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { foldGutter, indentOnInput } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorState, Prec } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { N8nIcon } from '@n8n/design-system';

import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';

const props = defineProps<{
	modelValue: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [code: string];
}>();

const editorContainer = ref<HTMLDivElement>();
const editorView = ref<EditorView | null>(null);

const extensions = computed<Extension[]>(() => [
	javascript({ typescript: true }),
	lineNumbers(),
	EditorView.lineWrapping,
	codeEditorTheme({
		isReadOnly: false,
		maxHeight: '100%',
		minHeight: '100%',
		rows: -1,
	}),
	history(),
	Prec.highest(keymap.of(editorKeymap)),
	indentOnInput(),
	highlightActiveLine(),
	highlightActiveLineGutter(),
	foldGutter(),
	dropCursor(),
	EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
		if (!viewUpdate.docChanged || !editorView.value) return;
		emit('update:modelValue', editorView.value.state.doc.toString());
	}),
]);

function createEditor() {
	if (!editorContainer.value) return;
	const state = EditorState.create({
		doc: props.modelValue,
		extensions: extensions.value,
	});
	editorView.value = new EditorView({
		parent: editorContainer.value,
		state,
	});
}

function destroyEditor() {
	editorView.value?.destroy();
	editorView.value = null;
}

onMounted(createEditor);
onBeforeUnmount(destroyEditor);

watch(
	() => props.modelValue,
	(newValue) => {
		const current = editorView.value?.state.doc.toString();
		if (current !== undefined && current !== newValue) {
			destroyEditor();
			createEditor();
		}
	},
);
</script>

<template>
	<div :class="$style.editor">
		<div :class="$style.toolbar">
			<div :class="$style.fileInfo">
				<N8nIcon icon="file-code" :size="14" />
				<span :class="$style.filename">agent.ts</span>
				<span :class="$style.badge">TypeScript</span>
			</div>
		</div>

		<div ref="editorContainer" :class="$style.editorArea" />

		<div :class="$style.statusBar">
			<div :class="$style.statusRight">
				<span :class="$style.statusText">Tokens: --</span>
				<span :class="$style.statusText">Cost: --</span>
			</div>
		</div>
	</div>
</template>

<style module>
.editor {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	background-color: var(--color--foreground--tint-2);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
}

.fileInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.filename {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.badge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.editorArea {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	position: relative;
}

.editorArea > div {
	height: 100%;
}

.editorArea :global(.cm-editor) {
	height: 100%;
}

.editorArea :global(.cm-scroller) {
	overflow: auto;
}

.statusBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
}

.statusRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.statusText {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}
</style>
