<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { AgentJsonConfig } from '../types';
import shared from '../styles/agent-panel.module.scss';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		readOnly?: boolean;
	}>(),
	{
		readOnly: false,
	},
);

const emit = defineEmits<{
	'update:config': [config: AgentJsonConfig];
}>();

const jsonContainer = ref<HTMLDivElement>();
let jsonView: EditorView | null = null;
let isProgrammaticJsonUpdate = false;
const jsonError = ref('');
const editableCompartment = new Compartment();

function editableExtensions(editable: boolean) {
	return [EditorState.readOnly.of(!editable), EditorView.editable.of(editable)];
}

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
				editableCompartment.of(editableExtensions(!props.readOnly)),
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
	() => props.readOnly,
	(readOnly) => {
		if (!jsonView) return;
		jsonView.dispatch({
			effects: editableCompartment.reconfigure(editableExtensions(!readOnly)),
		});
	},
);

watch(
	() => props.config,
	(newConfig) => {
		if (!jsonView) return;
		const newText = configToJson(newConfig);
		const current = jsonView.state.doc.toString();
		if (current === newText) return;
		// Don't stomp on the user's in-progress edit. An external config update
		// (e.g. the builder streaming a new config) while the user is typing
		// would otherwise replace their buffer mid-keystroke.
		if (jsonView.hasFocus) return;
		isProgrammaticJsonUpdate = true;
		// Preserve the user's selection/cursor; CodeMirror clamps positions that
		// would fall outside the new doc length.
		jsonView.dispatch({
			changes: { from: 0, to: current.length, insert: newText },
			selection: jsonView.state.selection,
		});
		isProgrammaticJsonUpdate = false;
		jsonError.value = '';
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
		<div ref="jsonContainer" :class="[$style.editorArea, readOnly && shared.disabledOverlay]" />
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
