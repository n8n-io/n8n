<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { useI18n } from '@n8n/i18n';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { useCodeMirrorEditor } from '../composables/useCodeMirrorEditor';
import type { AgentJsonConfig } from '../types';
import shared from '../styles/agent-panel.module.scss';
import AgentJsonCopyButton from './AgentJsonCopyButton.vue';

const props = withDefaults(
	defineProps<{
		value: unknown;
		readOnly?: boolean;
		showReadOnlyOverlay?: boolean;
		copyButtonTestId?: string;
	}>(),
	{
		readOnly: false,
		showReadOnlyOverlay: true,
		copyButtonTestId: 'agent-json-copy',
	},
);

const emit = defineEmits<{
	'update:value': [value: AgentJsonConfig];
}>();

const i18n = useI18n();
const jsonContainer = ref<HTMLDivElement>();
const jsonError = ref('');

const jsonValue = computed(() => props.value);

function valueToJson(value: unknown): string {
	if (value === null || value === undefined) return '';
	return JSON.stringify(value, null, 2) ?? '';
}

function isAgentJsonConfig(value: unknown): value is AgentJsonConfig {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const currentJson = ref(valueToJson(jsonValue.value));

const debouncedJsonSave = useDebounceFn((text: string) => {
	if (props.readOnly) return;

	try {
		const parsed: unknown = JSON.parse(text);
		if (!isAgentJsonConfig(parsed)) {
			jsonError.value = i18n.baseText('agents.builder.editor.invalidJson');
			return;
		}
		jsonError.value = '';
		emit('update:value', parsed);
	} catch {
		jsonError.value = i18n.baseText('agents.builder.editor.invalidJson');
	}
}, 800);

const editor = useCodeMirrorEditor({
	container: jsonContainer,
	initialDoc: valueToJson(jsonValue.value),
	readOnly: toRef(props, 'readOnly'),
	extensions: [
		json(),
		lineNumbers(),
		EditorView.lineWrapping,
		history(),
		keymap.of(defaultKeymap),
		codeEditorTheme({ isReadOnly: false, maxHeight: '100%', minHeight: '100%', rows: -1 }),
	],
	onChange: (text) => {
		currentJson.value = text;
		void debouncedJsonSave(text);
	},
});

function replaceJson(nextJson: string) {
	editor.replaceDoc(nextJson);
	currentJson.value = nextJson;
}

watch(
	jsonValue,
	(newValue) => {
		const view = editor.getView();
		if (!view) return;
		// Don't stomp on the user's in-progress edit while they're typing.
		if (!props.readOnly && view.hasFocus) return;
		replaceJson(valueToJson(newValue));
		jsonError.value = '';
	},
	{ deep: true },
);
</script>

<template>
	<div :class="$style.root">
		<AgentJsonCopyButton
			:content="currentJson"
			:class="$style.copyButton"
			:test-id="props.copyButtonTestId"
		/>
		<div v-if="jsonError" :class="$style.errorBanner">{{ jsonError }}</div>
		<div
			ref="jsonContainer"
			:class="[
				$style.editorArea,
				props.readOnly && props.showReadOnlyOverlay && shared.disabledOverlay,
			]"
		/>
	</div>
</template>

<style module>
.root {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1;
	width: 100%;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.copyButton {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--lg);
	z-index: 1;
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
	min-height: 0;
	overflow: hidden;
}

.editorArea > div,
.editorArea :global(.cm-editor) {
	height: 100%;
}

.editorArea :global(.cm-scroller) {
	overflow: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}
</style>
