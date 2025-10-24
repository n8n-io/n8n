<script setup lang="ts">
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { useI18n } from '@n8n/i18n';
import { highlighter } from '../../plugins/codemirror/resolvableHighlighter';
import type { Plaintext, Resolved, Segment } from '@/types/expressions';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { forceParse } from '@/utils/forceParse';

interface ExpressionOutputProps {
	segments: Segment[];
	extensions?: Extension[];
}

const props = withDefaults(defineProps<ExpressionOutputProps>(), { extensions: () => [] });

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

watch(
	() => props.segments,
	() => {
		if (!editor.value) return;

		editor.value.dispatch({
			changes: { from: 0, to: editor.value.state.doc.length, insert: resolvedExpression.value },
		});

		highlighter.addColor(editor.value as EditorView, resolvedSegments.value);
		highlighter.removeColor(editor.value as EditorView, plaintextSegments.value);
	},
);

onMounted(() => {
	editor.value = new EditorView({
		parent: root.value as HTMLElement,
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
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});

defineExpose({ getValue: () => '=' + resolvedExpression.value });
</script>

<template>
	<div ref="root" data-test-id="expression-output"></div>
</template>
