<script setup lang="ts">
import { history } from '@codemirror/commands';
import {
	LanguageSupport,
	bracketMatching,
	ensureSyntaxTree,
	foldGutter,
	indentOnInput,
} from '@codemirror/language';
import { Prec } from '@codemirror/state';
import {
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import htmlParser from 'prettier/plugins/html';
import cssParser from 'prettier/plugins/postcss';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, toValue } from 'vue';

import { useExpressionEditor } from '@/composables/useExpressionEditor';
import { htmlEditorEventBus } from '@/event-bus';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { dropInExpressionEditor, mappingDropCursor } from '@/plugins/codemirror/dragAndDrop';
import {
	expressionCloseBrackets,
	expressionCloseBracketsConfig,
} from '@/plugins/codemirror/expressionCloseBrackets';
import { editorKeymap } from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';
import { autoCloseTags, htmlLanguage } from 'codemirror-lang-html-n8n';
import { codeEditorTheme } from '../CodeNodeEditor/theme';
import type { Range, Section } from './types';
import { nonTakenRanges } from './utils';

type Props = {
	modelValue: string;
	rows?: number;
	isReadOnly?: boolean;
	fullscreen?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 4,
	isReadOnly: false,
	fullscreen: false,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const htmlEditor = ref<HTMLElement>();
const extensions = computed(() => [
	bracketMatching(),
	n8nAutocompletion(),
	new LanguageSupport(htmlLanguage, [
		htmlLanguage.data.of({ closeBrackets: expressionCloseBracketsConfig }),
		n8nCompletionSources().map((source) => htmlLanguage.data.of(source)),
	]),
	autoCloseTags,
	expressionCloseBrackets(),
	Prec.highest(keymap.of(editorKeymap)),
	indentOnInput(),
	codeEditorTheme({
		isReadOnly: props.isReadOnly,
		maxHeight: props.fullscreen ? '100%' : '40vh',
		minHeight: '20vh',
		rows: props.rows,
	}),
	lineNumbers(),
	highlightActiveLineGutter(),
	history(),
	foldGutter(),
	dropCursor(),
	indentOnInput(),
	highlightActiveLine(),
	mappingDropCursor(),
]);
const {
	editor: editorRef,
	readEditorValue,
	focus,
} = useExpressionEditor({
	editorRef: htmlEditor,
	editorValue: () => props.modelValue,
	extensions,
	onChange: () => {
		emit('update:model-value', readEditorValue());
	},
});

const sections = computed(() => {
	const editor = toValue(editorRef);
	if (!editor) return [];
	const { state } = editor;

	const fullTree = ensureSyntaxTree(state, state.doc.length);

	if (fullTree === null) {
		throw new Error('Failed to parse syntax tree');
	}

	let documentRange: Range = [-1, -1];
	const styleRanges: Range[] = [];
	const scriptRanges: Range[] = [];

	fullTree.cursor().iterate((node) => {
		if (node.type.name === 'Document') {
			documentRange = [node.from, node.to];
		}

		if (node.type.name === 'StyleSheet') {
			styleRanges.push([node.from - '<style>'.length, node.to + '</style>'.length]);
		}

		if (node.type.name === 'Script') {
			scriptRanges.push([node.from - '<script>'.length, node.to + ('<' + '/script>').length]);
			// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
		}
	});

	const htmlRanges = nonTakenRanges(documentRange, [...styleRanges, ...scriptRanges]);

	const styleSections: Section[] = styleRanges.map(([start, end]) => ({
		kind: 'style' as const,
		range: [start, end],
		content: state.sliceDoc(start, end).replace(/<\/?style>/g, ''),
	}));

	const scriptSections: Section[] = scriptRanges.map(([start, end]) => ({
		kind: 'script' as const,
		range: [start, end],
		content: state.sliceDoc(start, end).replace(/<\/?script>/g, ''),
	}));

	const htmlSections: Section[] = htmlRanges.map(([start, end]) => ({
		kind: 'html' as const,
		range: [start, end] as Range,
		content: state.sliceDoc(start, end).replace(/<\/html>/g, ''),
		// opening tag may contain attributes, e.g. <html lang="en">
	}));

	return [...styleSections, ...scriptSections, ...htmlSections].sort(
		(a, b) => a.range[0] - b.range[0],
	);
});

function isMissingHtmlTags() {
	const zerothSection = sections.value.at(0);

	return (
		!zerothSection?.content.trim().startsWith('<html') &&
		!zerothSection?.content.trim().endsWith('</html>')
	);
}

async function formatHtml() {
	const editor = toValue(editorRef);
	if (!editor) return;

	const sectionToFormat = sections.value;
	if (sectionToFormat.length === 1 && isMissingHtmlTags()) {
		const zerothSection = sectionToFormat.at(0) as Section;

		const formatted = (
			await format(zerothSection.content, {
				parser: 'html',
				plugins: [htmlParser],
			})
		).trim();

		return editor.dispatch({
			changes: { from: 0, to: editor.state.doc.length, insert: formatted },
		});
	}

	const formatted = [];

	for (const { kind, content } of sections.value) {
		if (kind === 'style') {
			const formattedStyle = await format(content, {
				parser: 'css',
				plugins: [cssParser],
			});

			formatted.push(`<style>\n${formattedStyle}</style>`);
		}

		if (kind === 'script') {
			const formattedScript = await format(content, {
				parser: 'babel',
				plugins: [jsParser, estree],
			});

			formatted.push(`<script>\n${formattedScript}<` + '/script>');
			// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
		}

		if (kind === 'html') {
			const match = content.match(/(?<pre>[\s\S]*<html[\s\S]*?>)(?<rest>[\s\S]*)/);

			if (!match?.groups?.pre || !match.groups?.rest) continue;

			// Prettier cannot format pre-HTML section, e.g. <!DOCTYPE html>, so keep as is

			const { pre, rest } = match.groups;

			const formattedRest = await format(rest, {
				parser: 'html',
				plugins: [htmlParser],
			});

			formatted.push(`${pre}\n${formattedRest}</html>`);
		}
	}

	if (formatted.length === 0) return;

	editor.dispatch({
		changes: { from: 0, to: editor.state.doc.length, insert: formatted.join('\n\n') },
	});
}

onMounted(() => {
	htmlEditorEventBus.on('format-html', formatHtml);
});

onBeforeUnmount(() => {
	htmlEditorEventBus.off('format-html', formatHtml);
});

async function onDrop(value: string, event: MouseEvent) {
	if (!editorRef.value) return;

	await dropInExpressionEditor(toRaw(editorRef.value), event, value);
}

defineExpose({
	focus,
});
</script>

<template>
	<div :class="$style.editor">
		<DraggableTarget type="mapping" :disabled="isReadOnly" @drop="onDrop">
			<template #default="{ activeDrop, droppable }">
				<div
					ref="htmlEditor"
					:class="[
						$style.fillHeight,
						{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
					]"
					data-test-id="html-editor-container"
				></div
			></template>
		</DraggableTarget>
		<slot name="suffix" />
	</div>
</template>

<style lang="scss" module>
.editor {
	height: 100%;

	& > div {
		height: 100%;
	}
}

.fillHeight {
	height: 100%;
}

.droppable {
	:global(.cm-editor) {
		border-color: var(--color-ndv-droppable-parameter);
		border-style: dashed;
		border-width: 1.5px;
	}
}

.activeDrop {
	:global(.cm-editor) {
		border-color: var(--color-success);
		border-style: solid;
		cursor: grabbing;
		border-width: 1px;
	}
}
</style>
