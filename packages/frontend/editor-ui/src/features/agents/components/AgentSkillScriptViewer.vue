<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { python } from '@codemirror/lang-python';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';

const props = defineProps<{ code: string }>();

const container = ref<HTMLDivElement>();
let view: EditorView | null = null;

function createEditor(doc: string) {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				python(),
				lineNumbers(),
				EditorView.lineWrapping,
				EditorState.readOnly.of(true),
				EditorView.editable.of(false),
				codeEditorTheme({ isReadOnly: true, maxHeight: '100%' }),
			],
		}),
		parent: container.value,
	});
}

onMounted(() => createEditor(props.code ?? ''));

onBeforeUnmount(() => {
	view?.destroy();
	view = null;
});

watch(
	() => props.code,
	(next) => {
		if (!view) return;
		const nextDoc = next ?? '';
		if (view.state.doc.toString() === nextDoc) return;
		view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nextDoc } });
	},
);
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-skill-script-viewer">
		<div ref="container" :class="$style.editor"></div>
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
	overflow: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.editor :global(.cm-editor) {
	border: none;
	border-radius: 0;
	height: 100%;
}
</style>
