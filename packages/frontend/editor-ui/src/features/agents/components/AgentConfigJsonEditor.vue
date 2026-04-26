<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { useCodeMirrorEditor } from '../composables/useCodeMirrorEditor';
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

const editor = useCodeMirrorEditor({
	container: jsonContainer,
	initialDoc: configToJson(props.config),
	readOnly: toRef(props, 'readOnly'),
	extensions: [
		json(),
		lineNumbers(),
		EditorView.lineWrapping,
		history(),
		keymap.of(defaultKeymap),
		codeEditorTheme({ isReadOnly: false, maxHeight: '100%', minHeight: '100%', rows: -1 }),
	],
	onChange: (text) => void debouncedJsonSave(text),
});

watch(
	() => props.config,
	(newConfig) => {
		const view = editor.getView();
		if (!view) return;
		// Don't stomp on the user's in-progress edit while they're typing.
		if (view.hasFocus) return;
		editor.replaceDoc(configToJson(newConfig));
		jsonError.value = '';
	},
	{ deep: true },
);
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
