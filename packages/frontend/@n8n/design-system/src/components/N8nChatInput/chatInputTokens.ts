import { formatChatToken, splitChatTokens, type ChatToken } from '@n8n/utils/chat-tokens';
import { Extension, Node, type JSONContent } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { Plugin, type EditorState } from '@tiptap/pm/state';
import { VueNodeViewRenderer } from '@tiptap/vue-3';

import ChatTokenNodeView from './ChatTokenNodeView.vue';
import type { IconName } from '../N8nIcon/icons';

/** How a host turns on inline tokens in `N8nChatInput`. */
export interface N8nChatInputTokenOptions {
	/** Reports a token query while the user types after `@`. Off while the host cannot take a pick. */
	trigger?: boolean;
	/** The icon of a token, from its target. */
	icon?: (href: string) => IconName | undefined;
}

/** Why a token query ended without a pick. */
export type ChatInputTokenQueryEnd = 'deleted' | 'moved';

export const CHAT_TOKEN_NODE = 'chatToken';

/** Stands in for a token when the editor reads text, so offsets still match positions. */
const TOKEN_PLACEHOLDER = '\uFFFC';

/**
 * Characters that start a token query. Japanese IMEs, and CJK IMEs in
 * full-width mode, emit the fullwidth `＠` (U+FF20) for the `@` key.
 */
const TRIGGER_CHARACTERS = new Set(['@', '＠']);

export interface ChatTokenNodeOptions {
	icon?: (href: string) => IconName | undefined;
}

/** An inline atom: the caret skips it, and one Backspace deletes it whole. */
export const ChatTokenNode = Node.create<ChatTokenNodeOptions>({
	name: CHAT_TOKEN_NODE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,
	draggable: false,

	addOptions() {
		return { icon: undefined };
	},

	addAttributes() {
		return {
			label: { default: '' },
			href: { default: '' },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-chat-token]',
				// The form that `renderHTML` writes: the target in `data-href`, the label after `@`.
				getAttrs: (element) => ({
					href: element.getAttribute('data-href') ?? '',
					label: (element.textContent ?? '').replace(/^@/, ''),
				}),
			},
		];
	},

	renderHTML({ node }) {
		return [
			'span',
			{ 'data-chat-token': '', 'data-href': node.attrs.href },
			`@${node.attrs.label}`,
		];
	},

	renderText({ node }) {
		return formatChatToken({ label: String(node.attrs.label), href: String(node.attrs.href) });
	},

	addNodeView() {
		return VueNodeViewRenderer(ChatTokenNodeView);
	},
});

function inlineContent(line: string): JSONContent[] {
	return splitChatTokens(line).flatMap((segment): JSONContent[] => {
		if (segment.type === 'token') {
			return [{ type: CHAT_TOKEN_NODE, attrs: { label: segment.label, href: segment.href } }];
		}
		return segment.text ? [{ type: 'text', text: segment.text }] : [];
	});
}

/** The editor document for message text: one paragraph per line, tokens inline. */
export function textToDoc(text: string): JSONContent {
	return {
		type: 'doc',
		content: text.split('\n').map((line) => {
			const content = inlineContent(line);
			return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
		}),
	};
}

/** The message text of a document: lines joined with `\n`, tokens in their text form. */
export function docToText(doc: ProseMirrorNode): string {
	const lines: string[] = [];
	doc.forEach((block) => {
		let line = '';
		block.forEach((child) => {
			if (child.type.name === CHAT_TOKEN_NODE) {
				line += formatChatToken({
					label: String(child.attrs.label),
					href: String(child.attrs.href),
				});
			} else if (child.isText) {
				line += child.text ?? '';
			}
		});
		lines.push(line);
	});
	return lines.join('\n');
}

/** Pasted text as a slice, with tokens in it turned back into token nodes. */
export function textToSlice(schema: Schema, text: string): Slice {
	const lines = text.replace(/\r\n?/g, '\n').split('\n');
	const inlineNodes = (line: string) =>
		inlineContent(line).map((content) => schema.nodeFromJSON(content));
	if (lines.length === 1) return new Slice(Fragment.from(inlineNodes(lines[0])), 0, 0);
	const paragraphs = lines.map((line) => schema.nodes.paragraph.create(null, inlineNodes(line)));
	return new Slice(Fragment.from(paragraphs), 1, 1);
}

/** The `@query` before the caret, in document positions. */
export interface ChatTokenTrigger {
	from: number;
	to: number;
	query: string;
}

/**
 * Finds the `@` that the caret is in a query for: the last trigger before the
 * caret in the same line, at the start of the line or after whitespace, with
 * no token between it and the caret. The query may hold spaces, because
 * resource names do.
 */
export function findTokenTrigger(state: EditorState): ChatTokenTrigger | undefined {
	const { selection } = state;
	if (!selection.empty) return undefined;
	const $caret = selection.$from;
	if (!$caret.parent.isTextblock) return undefined;
	const before = $caret.parent.textBetween(0, $caret.parentOffset, undefined, TOKEN_PLACEHOLDER);
	let index = -1;
	for (let i = before.length - 1; i >= 0; i--) {
		if (TRIGGER_CHARACTERS.has(before[i])) {
			index = i;
			break;
		}
	}
	if (index < 0) return undefined;
	if (index > 0 && !/\s/.test(before[index - 1])) return undefined;
	const query = before.slice(index + 1);
	if (query.includes(TOKEN_PLACEHOLDER) || query.includes('\n')) return undefined;
	const start = $caret.start();
	return { from: start + index, to: $caret.pos, query };
}

/** True when the document position holds a trigger character. */
export function isTriggerAt(state: EditorState, position: number): boolean {
	if (position < 0 || position >= state.doc.content.size) return false;
	return TRIGGER_CHARACTERS.has(state.doc.textBetween(position, position + 1, undefined, ' '));
}

/**
 * Rejects a change that makes the message text longer than the limit, from any
 * source: typing, paste, drop or a token. The limit counts a token by its text
 * form, as the message sends it. A change that makes the text shorter, and
 * content that the host sets, always apply.
 */
export function createMaxLengthLimit(getMaxLength: () => number | undefined) {
	return Extension.create({
		name: 'chatInputMaxLength',
		addProseMirrorPlugins() {
			return [
				new Plugin({
					filterTransaction: (transaction, state) => {
						const maxLength = getMaxLength();
						if (maxLength === undefined || !transaction.docChanged) return true;
						if (transaction.getMeta('preventUpdate') === true) return true;
						const length = docToText(transaction.doc).length;
						return length <= maxLength || length <= docToText(state.doc).length;
					},
				}),
			];
		},
	});
}

/** Enter submits. Shift+Enter starts a new line, or submits in a single-line composer. */
export function createSubmitKeymap(
	onSubmit: () => void,
	isSingleLine: () => boolean = () => false,
) {
	return Extension.create({
		name: 'chatInputSubmit',
		priority: 1000,
		addKeyboardShortcuts() {
			return {
				Enter: ({ editor }) => {
					if (editor.view.composing) return false;
					onSubmit();
					return true;
				},
				'Shift-Enter': ({ editor }) => {
					if (!isSingleLine()) return editor.commands.splitBlock();
					if (editor.view.composing) return false;
					onSubmit();
					return true;
				},
				'Mod-Enter': ({ editor }) => {
					if (editor.view.composing) return false;
					onSubmit();
					return true;
				},
			};
		},
	});
}

export type { ChatToken };
