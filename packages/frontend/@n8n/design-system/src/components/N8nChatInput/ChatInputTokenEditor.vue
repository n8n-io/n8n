<script lang="ts" setup>
import type { ChatToken } from '@n8n/utils/chat-tokens';
import Placeholder from '@tiptap/extension-placeholder';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { onBeforeUnmount, useCssModule, watch } from 'vue';

import {
	CHAT_TOKEN_NODE,
	ChatTokenNode,
	createSubmitKeymap,
	docToText,
	findTokenTrigger,
	isTriggerAt,
	textToDoc,
	textToSlice,
	type ChatInputTokenQueryEnd,
	type ChatTokenTrigger,
} from './chatInputTokens';
import type { IconName } from '../N8nIcon/icons';

/** The rich editor of `N8nChatInput` when a host turns on inline tokens. */
export interface ChatInputTokenEditorProps {
	modelValue: string;
	placeholder?: string;
	disabled?: boolean;
	maxLength?: number;
	/** Reports a token query while the user types after `@`. */
	trigger?: boolean;
	icon?: (href: string) => IconName | undefined;
	blockCanvasShortcuts?: boolean;
	inputTestId?: string;
	minRows?: number;
	/** Scrolls past this many rows. Without it, the editor fills its container. */
	maxRows?: number;
}

const props = withDefaults(defineProps<ChatInputTokenEditorProps>(), {
	placeholder: '',
	disabled: false,
	maxLength: undefined,
	trigger: false,
	icon: undefined,
	blockCanvasShortcuts: true,
	inputTestId: undefined,
	minRows: 1,
	maxRows: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
	/** The query after `@`, or `undefined` with the reason when the query ends without a pick. */
	'token-query': [query: string | undefined, end?: ChatInputTokenQueryEnd];
}>();

const $style = useCssModule();

/** The text that the editor last emitted or received, so an echo of it does not reset the editor. */
let currentText = props.modelValue;
let activeTrigger: ChatTokenTrigger | undefined;
/** A trigger that the user dismissed does not reopen while it stays in the text. */
let dismissedFrom: number | undefined;

function updateTrigger(state: EditorState, transaction?: Transaction): void {
	if (dismissedFrom !== undefined && transaction?.docChanged) {
		const mapped = transaction.mapping.mapResult(dismissedFrom);
		dismissedFrom = mapped.deleted || !isTriggerAt(state, mapped.pos) ? undefined : mapped.pos;
	}

	const previous = activeTrigger;
	let next = props.trigger ? findTokenTrigger(state) : undefined;
	if (next && !previous && next.from === dismissedFrom) next = undefined;
	activeTrigger = next;

	if (next) {
		if (previous?.query !== next.query || previous.from !== next.from) {
			emit('token-query', next.query);
		}
		return;
	}
	if (!previous) return;
	const mapped = transaction?.docChanged
		? transaction.mapping.mapResult(previous.from)
		: { pos: previous.from, deleted: false };
	const deleted = mapped.deleted || !isTriggerAt(state, mapped.pos);
	emit('token-query', undefined, deleted ? 'deleted' : 'moved');
}

const editor = useEditor({
	content: textToDoc(props.modelValue),
	editable: !props.disabled,
	extensions: [
		// Plain text only: paragraphs for lines, no marks or other blocks.
		StarterKit.configure({
			blockquote: false,
			bold: false,
			bulletList: false,
			code: false,
			codeBlock: false,
			dropcursor: false,
			gapcursor: false,
			hardBreak: false,
			heading: false,
			horizontalRule: false,
			italic: false,
			link: false,
			listItem: false,
			listKeymap: false,
			orderedList: false,
			strike: false,
			trailingNode: false,
			underline: false,
		}),
		Placeholder.configure({ placeholder: () => props.placeholder }),
		ChatTokenNode.configure({ icon: (href: string) => props.icon?.(href) }),
		createSubmitKeymap(() => emit('submit')),
	],
	coreExtensionOptions: {
		clipboardTextSerializer: { blockSeparator: '\n' },
	},
	editorProps: {
		attributes: () => ({
			class: [
				$style.content,
				'ignore-key-press-node-creator',
				props.blockCanvasShortcuts ? 'ignore-key-press-canvas' : '',
			]
				.filter(Boolean)
				.join(' '),
			// No `role`: an open picker makes the editor its combobox, and the editor
			// would set its own role back on the next update.
			'aria-multiline': 'true',
			...(props.placeholder ? { 'aria-placeholder': props.placeholder } : {}),
			...(props.inputTestId ? { 'data-test-id': props.inputTestId } : {}),
		}),
		// Pasted content is plain text. Tokens in it come back as tokens. Files are
		// left to the host, which listens for paste around the composer.
		handlePaste: (view, event) => {
			const data = event.clipboardData;
			if (!data) return false;
			if (data.files.length > 0) return true;
			const text = data.getData('text/plain');
			if (!text) return true;
			view.dispatch(view.state.tr.replaceSelection(textToSlice(view.state.schema, text)));
			return true;
		},
		handleTextInput: (view, from, to, text) => {
			if (props.maxLength === undefined) return false;
			const length = docToText(view.state.doc).length - (to - from) + text.length;
			return length > props.maxLength;
		},
	},
	// A restored draft puts the caret after its text, as a textarea does.
	onCreate: ({ editor: instance }) => {
		instance.commands.setTextSelection(instance.state.doc.content.size);
	},
	onUpdate: ({ editor: instance }) => {
		currentText = docToText(instance.state.doc);
		emit('update:modelValue', currentText);
	},
	onTransaction: ({ editor: instance, transaction }) => {
		updateTrigger(instance.state, transaction);
	},
	onFocus: ({ event }) => emit('focus', event),
	onBlur: ({ event }) => emit('blur', event),
});

watch(
	() => props.modelValue,
	(value) => {
		const instance = editor.value;
		if (!instance || value === currentText) return;
		currentText = value;
		instance.commands.setContent(textToDoc(value), { emitUpdate: false });
		instance.commands.setTextSelection(instance.state.doc.content.size);
	},
);

watch(
	() => props.disabled,
	(disabled) => editor.value?.setEditable(!disabled, false),
);

// Placeholder decorations update on a transaction, and an animated placeholder
// changes without one.
watch(
	() => props.placeholder,
	() => {
		const instance = editor.value;
		if (instance) instance.view.dispatch(instance.state.tr.setMeta('addToHistory', false));
	},
);

watch(
	() => props.trigger,
	(enabled) => {
		const instance = editor.value;
		if (!enabled) {
			activeTrigger = undefined;
			return;
		}
		if (instance) updateTrigger(instance.state);
	},
);

onBeforeUnmount(() => editor.value?.destroy());

/** Focuses the editor without scrolling the page. */
function focus(options?: FocusOptions): void {
	const instance = editor.value;
	if (!instance) return;
	if (options?.preventScroll) {
		(instance.view.dom as HTMLElement).focus({ preventScroll: true });
		return;
	}
	instance.commands.focus();
}

function getElement(): HTMLElement | undefined {
	return editor.value?.view.dom as HTMLElement | undefined;
}

/**
 * Puts a token where the user typed `@query`, or at the caret when no query is
 * open, followed by a space.
 */
function insertToken(token: ChatToken): void {
	const instance = editor.value;
	if (!instance) return;
	const { state } = instance;
	const range = activeTrigger
		? { from: activeTrigger.from, to: activeTrigger.to }
		: { from: state.selection.from, to: state.selection.to };
	activeTrigger = undefined;
	dismissedFrom = undefined;
	const nextCharacter = state.doc.textBetween(
		range.to,
		Math.min(range.to + 1, state.doc.content.size),
		undefined,
		'\uFFFC',
	);
	instance
		.chain()
		.focus()
		.insertContentAt(range, [
			{ type: CHAT_TOKEN_NODE, attrs: { label: token.label, href: token.href } },
			...(nextCharacter === ' ' ? [] : [{ type: 'text', text: ' ' }]),
		])
		.run();
}

/**
 * Removes an `@` that has no query after it, for a picker closed right after
 * the `@` was typed. Returns false when there is nothing to remove.
 */
function removeEmptyTrigger(): boolean {
	const instance = editor.value;
	const trigger = activeTrigger;
	if (!instance || !trigger || trigger.query.trim() !== '') return false;
	activeTrigger = undefined;
	instance.chain().deleteRange({ from: trigger.from, to: trigger.to }).run();
	return true;
}

/** Ends the open query. Its `@` does not open a query again while it stays in the text. */
function dismissTrigger(): void {
	if (activeTrigger) dismissedFrom = activeTrigger.from;
	activeTrigger = undefined;
}

/** Inserts text at the caret, replacing the selection. Tokens in the text stay tokens. */
function insertText(text: string): void {
	const instance = editor.value;
	if (!instance) return;
	const { state, view } = instance;
	view.dispatch(state.tr.replaceSelection(textToSlice(state.schema, text)).scrollIntoView());
	instance.commands.focus();
}

defineExpose({ focus, getElement, insertToken, removeEmptyTrigger, dismissTrigger, insertText });
</script>

<template>
	<EditorContent
		:editor="editor"
		:class="$style.editor"
		:style="{
			'--chat-input-editor--min-rows': minRows,
			'--chat-input-editor--max-rows': maxRows,
		}"
	/>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	width: 100%;
	min-width: 0;
	min-height: 0;
}

.content {
	--chat-input-editor--line: calc(var(--font-size--md) * var(--line-height--xl));

	flex: 1 1 auto;
	box-sizing: border-box;
	min-height: calc(
		var(--chat-input-editor--line) * var(--chat-input-editor--min-rows) + 2 * var(--spacing--3xs)
	);
	max-height: calc(
		var(--chat-input-editor--line) * var(--chat-input-editor--max-rows, 1000) + 2 *
			var(--spacing--3xs)
	);
	overflow-y: auto;
	padding: var(--spacing--3xs);
	outline: none;
	font-family: var(--font-family);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	color: var(--text-color);
	scrollbar-width: none;

	&::-webkit-scrollbar {
		display: none;
	}

	:global(p) {
		margin: 0;
	}

	:global(p.is-editor-empty:first-child)::before {
		content: attr(data-placeholder);
		float: left;
		height: 0;
		color: var(--text-color--subtler);
		pointer-events: none;
	}

	&[contenteditable='false'] {
		cursor: not-allowed;
		color: var(--color--text--tint-1);
	}
}
</style>
