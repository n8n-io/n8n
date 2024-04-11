<script setup lang="ts">
import { EditorView } from '@codemirror/view';
import { EditorState, type SelectionRange } from '@codemirror/state';

import { useI18n } from '@/composables/useI18n';
import type { Plaintext, Resolved, Segment } from '@/types/expressions';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { outputTheme } from './theme';
import InlineExpressionTip from './InlineExpressionTip.vue';

interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	hoveringItemNumber: number;
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	isReadOnly?: boolean;
	visible?: boolean;
	noInputData?: boolean;
}

const props = withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	readOnly: false,
	visible: false,
	noInputData: false,
	editorState: undefined,
	selection: undefined,
	unresolvedExpression: undefined,
});

const i18n = useI18n();

const editor = ref<EditorView | null>(null);
const root = ref<HTMLElement | null>(null);

const resolvedExpression = computed(() => {
	if (props.segments.length === 0) {
		return i18n.baseText('parameterInput.emptyString');
	}

	return props.segments.reduce((acc, segment) => {
		acc += segment.kind === 'resolvable' ? (segment.resolved as string) : segment.plaintext;
		return acc;
	}, '');
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
			extensions: [outputTheme(), EditorState.readOnly.of(true), EditorView.lineWrapping],
		}),
	});
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});
</script>

<template>
	<div :class="visible ? $style.dropdown : $style.hidden">
		<n8n-text v-if="!noInputData" size="small" compact :class="$style.header">
			{{ i18n.baseText('parameterInput.resultForItem') }} {{ hoveringItemNumber }}
		</n8n-text>
		<n8n-text :class="$style.body">
			<div ref="root" data-test-id="inline-expression-editor-output"></div>
		</n8n-text>
		<div :class="$style.footer">
			<InlineExpressionTip
				:editor-state="editorState"
				:selection="selection"
				:unresolved-expression="unresolvedExpression"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.hidden {
	display: none;
}

.dropdown {
	display: flex;
	flex-direction: column;
	position: absolute;
	z-index: 2; // cover tooltips
	background: var(--color-code-background);
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	:global(.cm-editor) {
		background-color: var(--color-code-background);
	}

	.header,
	.body {
		padding: var(--spacing-3xs);
	}

	.footer {
		border-top: var(--border-base);
	}

	.header {
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding-left: var(--spacing-2xs);
		padding-top: var(--spacing-2xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);

		&:first-child {
			padding-top: var(--spacing-2xs);
		}
	}
}
</style>
