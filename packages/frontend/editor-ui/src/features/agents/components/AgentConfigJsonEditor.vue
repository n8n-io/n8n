<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { AgentJsonConfig } from '../types';

const props = defineProps<{
	config: AgentJsonConfig | null;
}>();

const emit = defineEmits<{
	'update:config': [config: AgentJsonConfig];
}>();

const jsonContainer = ref<HTMLDivElement>();
let jsonView: EditorView | null = null;
let isProgrammaticJsonUpdate = false;
const jsonError = ref('');

function configToJson(config: AgentJsonConfig | null): string {
	return config ? JSON.stringify(config, null, 2) : '';
}

const debouncedJsonSave = useDebounceFn((text: string) => {
	try {
		const parsed = JSON.parse(text) as AgentJsonConfig;
		jsonError.value = '';
		emit('update:config', parsed);
	} catch {
		jsonError.value = 'Invalid JSON';
	}
}, 800);

function createJsonEditor(doc: string) {
	if (!jsonContainer.value) return;
	jsonView = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				json(),
				lineNumbers(),
				EditorView.lineWrapping,
				history(),
				keymap.of(defaultKeymap),
				codeEditorTheme({ isReadOnly: false, maxHeight: '100%', minHeight: '100%', rows: -1 }),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged || isProgrammaticJsonUpdate) return;
					const text = update.state.doc.toString();
					void debouncedJsonSave(text);
				}),
			],
		}),
		parent: jsonContainer.value,
	});
}

watch(
	() => props.config,
	(newConfig) => {
		if (!jsonView) return;
		const newText = configToJson(newConfig);
		const current = jsonView.state.doc.toString();
		if (current !== newText && !jsonView.hasFocus) {
			isProgrammaticJsonUpdate = true;
			jsonView.dispatch({ changes: { from: 0, to: current.length, insert: newText } });
			isProgrammaticJsonUpdate = false;
			jsonError.value = '';
		}
	},
	{ deep: true },
);

onMounted(() => {
	createJsonEditor(configToJson(props.config));
});

onBeforeUnmount(() => {
	jsonView?.destroy();
	jsonView = null;
});
</script>

<template>
	<div :class="$style.root">
		<div v-if="jsonError" :class="$style.errorBanner">{{ jsonError }}</div>
		<div ref="jsonContainer" :class="$style.editorArea" />
	</div>
</template>

<style module>
.root {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.errorBanner {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	background-color: var(--color--danger--tint-4);
	border-bottom: var(--border-width) var(--border-style) var(--color--danger--tint-3);
	padding: var(--spacing--4xs) var(--spacing--sm);
}

.editorArea {
	flex: 1;
	min-height: 240px;
	overflow: hidden;
}

.editorArea > div,
.editorArea :global(.cm-editor) {
	height: 100%;
}

.editorArea :global(.cm-scroller) {
	overflow: auto;
}
</style>
