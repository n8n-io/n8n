<script setup lang="ts">
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { highlighter } from '../codemirror/resolvableHighlighter';
import type { Plaintext, Resolved, Segment } from '../types';
import { forceParse } from '../utils/forceParse';

interface ExpressionOutputProps {
	segments: Segment[];
	extensions?: Extension[];
	render?: 'text' | 'html' | 'markdown';
}

const props = withDefaults(defineProps<ExpressionOutputProps>(), {
	extensions: () => [],
	render: 'text',
});

// `html` and `markdown` are slots because their renderers are the host's:
// n8n's run-data viewers know about binary data, sandboxing and theming. They
// carry `$attrs` themselves: a slot is not an element, so nothing would land on
// it, and callers style and address this component from outside.
defineOptions({ inheritAttrs: false });

defineSlots<{
	html?: (props: { value: string; attrs: Record<string, unknown> }) => unknown;
	markdown?: (props: { value: string; attrs: Record<string, unknown> }) => unknown;
}>();

const i18n = useI18n();

const editor = ref<EditorView | null>(null);
const root = ref<HTMLElement | null>(null);

const resolvedExpression = computed(() => {
	if (props.segments.length === 0) {
		return i18n.baseText('parameterInput.emptyString');
	}

	return props.segments.reduce(
		(acc, segment) => {
			// skip duplicate segments
			if (acc.cursor >= segment.to) return acc;

			acc.resolved += segment.kind === 'resolvable' ? String(segment.resolved) : segment.plaintext;
			acc.cursor = segment.to;

			return acc;
		},
		{ resolved: '', cursor: 0 },
	).resolved;
});

const plaintextSegments = computed<Plaintext[]>(() => {
	return props.segments.filter((s): s is Plaintext => s.kind === 'plaintext');
});

const resolvedSegments = computed<Resolved[]>(() => {
	if (props.segments.length === 0) {
		const emptyExpression = resolvedExpression.value;
		const emptySegment: Resolved = {
			from: 0,
			to: emptyExpression.length,
			kind: 'resolvable',
			error: null,
			resolvable: '',
			resolved: emptyExpression,
			state: 'pending',
		};
		return [emptySegment];
	}

	let cursor = 0;

	return props.segments
		.map((segment) => {
			segment.from = cursor;
			cursor +=
				segment.kind === 'plaintext'
					? segment.plaintext.length
					: segment.resolved
						? (segment.resolved as string | number | boolean).toString().length
						: 0;
			segment.to = cursor;
			return segment;
		})
		.filter((segment): segment is Resolved => segment.kind === 'resolvable');
});

function initializeEditor() {
	if (!root.value) return;

	editor.value = new EditorView({
		parent: root.value,
		state: EditorState.create({
			doc: resolvedExpression.value,
			extensions: [
				EditorState.readOnly.of(true),
				EditorView.lineWrapping,
				EditorView.domEventHandlers({ scroll: (_, view) => forceParse(view) }),
				...props.extensions,
			],
		}),
	});

	highlighter.addColor(editor.value as EditorView, resolvedSegments.value);
	highlighter.removeColor(editor.value as EditorView, plaintextSegments.value);
}

watch(
	() => props.segments,
	() => {
		if (props.render !== 'text' || !editor.value) return;

		editor.value.dispatch({
			changes: { from: 0, to: editor.value.state.doc.length, insert: resolvedExpression.value },
		});

		highlighter.addColor(editor.value as EditorView, resolvedSegments.value);
		highlighter.removeColor(editor.value as EditorView, plaintextSegments.value);
	},
);

watch(
	() => props.render,
	async (newMode) => {
		if (newMode === 'text' && !editor.value) {
			await nextTick();
			initializeEditor();
		} else if ((newMode === 'html' || newMode === 'markdown') && editor.value) {
			editor.value.destroy();
			editor.value = null;
		}
	},
);

onMounted(() => {
	if (props.render !== 'text') return;
	initializeEditor();
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});

defineExpose({ getValue: () => '=' + resolvedExpression.value });
</script>

<!-- eslint-disable vue/no-multiple-template-root -- text renders here, html and markdown in a host slot -->
<template>
	<div v-if="render === 'text'" ref="root" data-test-id="expression-output" v-bind="$attrs"></div>

	<slot v-else-if="render === 'html'" name="html" :value="resolvedExpression" :attrs="$attrs" />

	<slot
		v-else-if="render === 'markdown'"
		name="markdown"
		:value="resolvedExpression"
		:attrs="$attrs"
	/>
</template>
