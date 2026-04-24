<script setup lang="ts">
/**
 * Agent builder main editor pane. PR1 renders the full JSON config blob.
 * PR2 extends this to accept a slice. Keep the public surface narrow so the
 * follow-up only has to add a `section` prop.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { useI18n } from '@n8n/i18n';

import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { AgentJsonConfig } from '../types';
import { tryParseConfig } from './agentSectionEditor.utils';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		readOnly?: boolean;
	}>(),
	{ readOnly: false },
);

const emit = defineEmits<{ 'update:config': [config: AgentJsonConfig] }>();

const i18n = useI18n();
const container = ref<HTMLDivElement>();
const parseError = ref('');
let view: EditorView | null = null;
let isProgrammatic = false;
const editableCompartment = new Compartment();

function editableExtensions(editable: boolean) {
	return [EditorState.readOnly.of(!editable), EditorView.editable.of(editable)];
}

function configToDoc(cfg: AgentJsonConfig | null): string {
	return cfg ? JSON.stringify(cfg, null, 2) : '';
}

const debouncedSave = useDebounceFn((text: string) => {
	const result = tryParseConfig(text);
	if (result.ok) {
		parseError.value = '';
		emit('update:config', result.value);
	} else {
		parseError.value = i18n.baseText('agents.builder.editor.invalidJson');
	}
}, getDebounceTime(DEBOUNCE_TIME.API.RESOURCE_SEARCH));

function createEditor(doc: string) {
	if (!container.value) return;
	view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				json(),
				lineNumbers(),
				EditorView.lineWrapping,
				history(),
				keymap.of(defaultKeymap),
				codeEditorTheme({ isReadOnly: props.readOnly, maxHeight: '100%' }),
				editableCompartment.of(editableExtensions(!props.readOnly)),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged || isProgrammatic) return;
					void debouncedSave(update.state.doc.toString());
				}),
			],
		}),
		parent: container.value,
	});
}

onMounted(() => createEditor(configToDoc(props.config)));

onBeforeUnmount(() => {
	view?.destroy();
	view = null;
});

watch(
	() => props.config,
	(next) => {
		if (!view) return;
		// Don't stomp on the user's in-progress edit. An external config update
		// (e.g. the builder streaming a new config) while the user is typing
		// would otherwise replace their buffer mid-keystroke.
		if (view.hasFocus) return;
		const nextDoc = configToDoc(next);
		if (view.state.doc.toString() === nextDoc) return;
		isProgrammatic = true;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: nextDoc },
			selection: view.state.selection,
		});
		isProgrammatic = false;
		parseError.value = '';
	},
	{ deep: true },
);

watch(
	() => props.readOnly,
	(ro) => {
		view?.dispatch({ effects: editableCompartment.reconfigure(editableExtensions(!ro)) });
	},
);
</script>

<template>
	<div :class="$style.wrapper" data-testid="agent-section-editor">
		<div ref="container" :class="$style.editor"></div>
		<div v-if="parseError" :class="$style.error">{{ parseError }}</div>
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

/* Kill the CodeMirror theme's own border — the editor column already owns the
   surrounding borders, so the editor's border only stacks with them. */
.editor :global(.cm-editor) {
	border: none;
	border-radius: 0;
	height: 100%;
}

.error {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	color: var(--color--text--danger);
	font-size: var(--font-size--2xs);
	background: var(--color--danger--tint-4);
	border-top: var(--border);
	border-color: var(--color--danger--tint-3);
}
</style>
