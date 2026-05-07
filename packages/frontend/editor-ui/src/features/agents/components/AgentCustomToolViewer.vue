<script setup lang="ts">
/**
 * Read-only TypeScript viewer for a custom tool's compiled source.
 * Shown in the editor column when the tree selects a `type: 'custom'` tool.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { javascript } from '@codemirror/lang-javascript';
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
				javascript({ typescript: true }),
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
	<div :class="$style.wrapper" data-test-id="agent-custom-tool-viewer">
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
}

.editor :global(.cm-editor) {
	border: none;
	border-radius: 0;
	height: 100%;
}
</style>
