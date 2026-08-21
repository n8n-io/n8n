<script setup lang="ts">
import { history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { foldGutter, indentOnInput } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import { Compartment, EditorState, Prec, type Extension } from '@codemirror/state';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	type ViewUpdate,
} from '@codemirror/view';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRef, watch } from 'vue';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';
import { useTypescriptStandalone } from '@/features/shared/editors/plugins/codemirror/typescript/client/useTypescriptStandalone';
import type { WorkerInitOptions } from '@/features/shared/editors/plugins/codemirror/typescript/types';

type Props = {
	modelValue: string;
	editorId: string;
	variables: string[];
	snippets: NonNullable<WorkerInitOptions['snippets']>;
	rows?: number;
};

const props = withDefaults(defineProps<Props>(), { rows: 12 });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const editorRef = ref<HTMLDivElement>();
const editor = shallowRef<EditorView | undefined>();
const tsCompartment = new Compartment();

const { createWorker } = useTypescriptStandalone(
	() => editor.value,
	() => ({
		id: props.editorId,
		variables: props.variables,
		snippets: props.snippets,
	}),
);

const baseExtensions = computed<Extension[]>(() => [
	javascript(),
	lineNumbers(),
	EditorView.lineWrapping,
	codeEditorTheme({
		isReadOnly: false,
		maxHeight: '40vh',
		minHeight: '20vh',
		rows: props.rows,
	}),
	history(),
	Prec.highest(keymap.of(editorKeymap)),
	lintGutter(),
	indentOnInput(),
	highlightActiveLine(),
	highlightActiveLineGutter(),
	foldGutter(),
	dropCursor(),
	EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
		if (!viewUpdate.docChanged || !editor.value) return;
		emit('update:modelValue', editor.value.state.doc.toString());
	}),
	tsCompartment.of([]),
]);

async function attachTypescript() {
	const extension = await createWorker();
	editor.value?.dispatch({ effects: tsCompartment.reconfigure(extension) });
}

onMounted(() => {
	editor.value = new EditorView({
		parent: editorRef.value,
		state: EditorState.create({ doc: props.modelValue, extensions: baseExtensions.value }),
	});
	void attachTypescript();
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});

// The worker's virtual types are init-time state; recreate it when the
// surrounding snippet context changes (e.g. scope switch swaps $project)
watch(
	() => props.snippets,
	() => void attachTypescript(),
);

watch(toRef(props, 'modelValue'), (newValue) => {
	const current = editor.value?.state.doc.toString();
	if (current !== undefined && current !== newValue) {
		editor.value?.dispatch({ changes: { from: 0, to: current.length, insert: newValue } });
	}
});

defineExpose({
	focus: () => editor.value?.focus(),
});
</script>

<template>
	<div ref="editorRef" class="ph-no-capture"></div>
</template>
