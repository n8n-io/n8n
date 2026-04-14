<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
	EditorView,
	keymap,
	ViewPlugin,
	type ViewUpdate,
	Decoration,
	type DecorationSet,
} from '@codemirror/view';
import { EditorState, type Range } from '@codemirror/state';
import { history, historyKeymap } from '@codemirror/commands';
import { parserWithMetaData as n8nParser } from '@n8n/codemirror-lang';
import {
	LanguageSupport,
	LRLanguage,
	syntaxHighlighting,
	HighlightStyle,
	syntaxTree,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { parseMixed, type SyntaxNodeRef } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { ElDialog } from 'element-plus';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		placeholder?: string;
		disabled?: boolean;
	}>(),
	{
		placeholder: '',
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();

const editorRef = ref<HTMLDivElement>();
const expandedEditorRef = ref<HTMLDivElement>();
const isEmpty = ref(true);
const hasError = ref(false);
const dialogVisible = ref(false);
let editorView: EditorView | null = null;
let expandedEditorView: EditorView | null = null;

// Mock $claims: every property returns a real array so .includes() works but .includ() throws
const mockClaims = new Proxy(
	{},
	{ get: (_target, prop) => (typeof prop === 'symbol' ? undefined : ['mock']) },
);

function validateExpression(value: string): boolean {
	if (!value.trim()) return true;
	const match = value.match(/^\{\{(.+)\}\}$/s);
	const jsContent = match ? match[1].trim() : value.trim();
	if (!jsContent) return true;
	try {
		// eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
		const fn = new Function('$claims', '$oidc', '$saml', '$provider', `return (${jsContent})`);
		fn(mockClaims, { idToken: {}, userInfo: {} }, { attributes: {} }, 'oidc');
		return true;
	} catch {
		return false;
	}
}

const isResolvable = (node: SyntaxNodeRef) => node.type.name === 'Resolvable';

const n8nParserWithNestedJs = n8nParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;
		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: isResolvable }
			: null;
	}),
});

const n8nLanguage = LRLanguage.define({ parser: n8nParserWithNestedJs });

const bracketDecoMark = Decoration.mark({ class: 'cm-expression-bracket' });

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: Array<Range<Decoration>> = [];
	const tree = syntaxTree(view.state);

	tree.iterate({
		enter(node) {
			if (node.name === 'OpenMarker' || node.name === 'CloseMarker') {
				decorations.push(bracketDecoMark.range(node.from, node.to));
			}
		},
	});

	return Decoration.set(decorations, true);
}

function createBracketPlugin() {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = buildDecorations(view);
			}
			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(update.view);
				}
			}
		},
		{ decorations: (v) => v.decorations },
	);
}

const expressionHighlightStyle = HighlightStyle.define([
	{ tag: tags.string, color: 'var(--color--success--shade-1)' },
	{ tag: tags.number, color: 'var(--color--primary)' },
	{ tag: tags.bool, color: 'var(--color--primary)' },
	{ tag: tags.keyword, color: 'var(--color--primary--shade-1)' },
	{ tag: tags.operator, color: 'var(--color--text--shade-1)' },
	{ tag: tags.propertyName, color: 'var(--color--success)' },
	{ tag: tags.variableName, color: 'var(--color--text--shade-1)' },
	{ tag: tags.function(tags.variableName), color: 'var(--color--success--shade-1)' },
	{ tag: tags.paren, color: 'var(--color--text--tint-1)' },
	{ tag: tags.punctuation, color: 'var(--color--text--tint-1)' },
]);

const editorUpdateListener = EditorView.updateListener.of((update) => {
	if (update.docChanged) {
		const newValue = update.state.doc.toString();
		isEmpty.value = newValue.length === 0;
		hasError.value = !validateExpression(newValue);
		if (newValue !== props.modelValue) {
			emit('update:modelValue', newValue);
		}
	}
});

const sharedThemeRules = {
	'.cm-content': {
		fontFamily: 'var(--font-family--monospace)',
		color: 'var(--input--color--text, var(--color--text--shade-1))',
		caretColor: 'var(--code--caret--color)',
	},
	'.cm-cursor, .cm-dropCursor': {
		borderLeftColor: 'var(--code--caret--color)',
	},
	'.cm-expression-bracket': {
		color: 'var(--color--text--shade-1)',
		fontWeight: '700',
	},
};

function createInlineExtensions() {
	return [
		new LanguageSupport(n8nLanguage),
		syntaxHighlighting(expressionHighlightStyle),
		createBracketPlugin(),
		history(),
		keymap.of(historyKeymap),
		EditorState.readOnly.of(props.disabled),
		EditorView.theme({
			'&': {
				fontSize: 'var(--font-size--sm)',
				borderWidth: 'var(--border-width)',
				borderStyle: 'var(--border-style)',
				borderColor: 'var(--input--border-color, var(--border-color))',
				borderRadius: 'var(--radius)',
				backgroundColor: 'var(--color--foreground--tint-2)',
				height: '30px',
				width: '100%',
				padding: '0 0 0 var(--spacing--2xs)',
			},
			'&.cm-focused': {
				outline: '0 !important',
				borderColor: 'var(--color--foreground--shade-1, var(--input--border-color))',
			},
			'.cm-content': {
				fontFamily: 'var(--font-family--monospace)',
				color: 'var(--input--color--text, var(--color--text--shade-1))',
				caretColor: props.disabled ? 'transparent' : 'var(--code--caret--color)',
				padding: '0 !important',
				lineHeight: '28px',
			},
			'.cm-line': {
				padding: '0 !important',
				whiteSpace: 'nowrap',
				lineHeight: '28px',
			},
			'.cm-scroller': {
				overflowX: 'auto',
				overflowY: 'hidden',
				display: 'flex',
				alignItems: 'center',
			},
			'.cm-cursor, .cm-dropCursor': sharedThemeRules['.cm-cursor, .cm-dropCursor'],
			'.cm-expression-bracket': sharedThemeRules['.cm-expression-bracket'],
		}),
		editorUpdateListener,
	];
}

function createExpandedExtensions() {
	return [
		new LanguageSupport(n8nLanguage),
		syntaxHighlighting(expressionHighlightStyle),
		createBracketPlugin(),
		history(),
		keymap.of(historyKeymap),
		EditorView.lineWrapping,
		EditorView.theme({
			'&': {
				fontSize: 'var(--font-size--xs)',
				borderWidth: 'var(--border-width)',
				borderStyle: 'var(--border-style)',
				borderColor: 'var(--input--border-color, var(--border-color))',
				borderRadius: 'var(--radius--lg)',
				backgroundColor: 'var(--color--foreground--tint-2)',
				minHeight: '120px',
				width: '100%',
				padding: 'var(--spacing--2xs) var(--spacing--xs)',
			},
			'&.cm-focused': {
				outline: '0 !important',
				borderColor: 'var(--color--foreground--shade-1, var(--input--border-color))',
			},
			'.cm-content': {
				fontFamily: 'var(--font-family--monospace)',
				color: 'var(--input--color--text, var(--color--text--shade-1))',
				caretColor: 'var(--code--caret--color)',
				padding: 'var(--spacing--4xs) 0',
			},
			'.cm-line': {
				padding: '0',
			},
			'.cm-scroller': {
				lineHeight: '1.68',
				overflow: 'auto',
			},
			'.cm-cursor, .cm-dropCursor': sharedThemeRules['.cm-cursor, .cm-dropCursor'],
			'.cm-expression-bracket': sharedThemeRules['.cm-expression-bracket'],
		}),
		editorUpdateListener,
	];
}

function openExpandedEditor() {
	dialogVisible.value = true;
	void nextTick(() => {
		if (!expandedEditorRef.value) return;

		expandedEditorView = new EditorView({
			state: EditorState.create({
				doc: props.modelValue,
				extensions: createExpandedExtensions(),
			}),
			parent: expandedEditorRef.value,
		});
		expandedEditorView.focus();
	});
}

function closeExpandedEditor() {
	dialogVisible.value = false;
	expandedEditorView?.destroy();
	expandedEditorView = null;
}

onMounted(() => {
	if (!editorRef.value) return;

	isEmpty.value = !props.modelValue;
	hasError.value = !validateExpression(props.modelValue);

	const state = EditorState.create({
		doc: props.modelValue,
		extensions: createInlineExtensions(),
	});

	editorView = new EditorView({
		state,
		parent: editorRef.value,
	});
});

onBeforeUnmount(() => {
	editorView?.destroy();
	editorView = null;
	expandedEditorView?.destroy();
	expandedEditorView = null;
});

watch(
	() => props.modelValue,
	(newVal) => {
		for (const view of [editorView, expandedEditorView]) {
			if (!view) continue;
			const currentVal = view.state.doc.toString();
			if (newVal !== currentVal) {
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: newVal },
				});
			}
		}
	},
);
</script>
<template>
	<div :class="$style.wrapper">
		<div
			ref="editorRef"
			:class="[
				$style.container,
				{
					[$style.disabled]: disabled,
					[$style.empty]: isEmpty,
					[$style.error]: hasError,
					[$style.valid]: !isEmpty && !hasError,
				},
			]"
			:data-placeholder="placeholder ? `{{ ${placeholder} }}` : ''"
			data-test-id="rule-expression-input"
		/>
		<N8nButton
			v-if="!disabled"
			variant="ghost"
			size="mini"
			:class="$style.expandButton"
			:aria-label="i18n.baseText('expressionEdit.editExpression')"
			data-test-id="expression-expand-button"
			@click="openExpandedEditor"
		>
			<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					fill="none"
				/>
			</svg>
		</N8nButton>
		<ElDialog
			:model-value="dialogVisible"
			:title="i18n.baseText('expressionEdit.editExpression')"
			width="620px"
			:close-on-click-modal="true"
			:append-to-body="true"
			@close="closeExpandedEditor"
		>
			<div ref="expandedEditorRef" :class="$style.expandedContainer" />
		</ElDialog>
	</div>
</template>
<style lang="scss" module>
.wrapper {
	flex: 1;
	min-width: 0;
	position: relative;
}

.container {
	width: 100%;

	:global(.cm-content) {
		padding: 0 !important;
	}
}

.valid :global(.cm-editor) {
	border-color: var(--color--success);
}

.error :global(.cm-editor) {
	border-color: var(--color--danger);
}

.error :global(.cm-content) {
	color: var(--color--danger) !important;
}

.error :global(.cm-content span) {
	color: inherit !important;
}

.empty::before {
	content: attr(data-placeholder);
	color: var(--color--text--tint-2);
	font-style: italic;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	line-height: 30px;
	pointer-events: none;
	position: absolute;
	left: var(--spacing--2xs);
	top: 0;
	z-index: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	right: var(--spacing--2xs);
}

.expandButton {
	position: absolute;
	right: 1px;
	bottom: 1px;
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	color: var(--color--text--tint-2);
	cursor: pointer;
	border-radius: 0 0 var(--radius) 0;
	background-color: var(--color--foreground--tint-2);

	&:hover {
		color: var(--color--text) !important;
		background-color: var(--color--foreground--tint-1) !important;
	}

	svg {
		transform: rotate(270deg);
	}
}

.expandedContainer {
	min-height: 120px;
}

.disabled {
	opacity: 0.6;
	pointer-events: none;
}
</style>
