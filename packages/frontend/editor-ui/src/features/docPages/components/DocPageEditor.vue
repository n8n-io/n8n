<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Editor } from '@tiptap/core';
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { createChildPageLink } from './editor/childPageLink';
import { createDocPageBaseExtensions } from './editor/docPageExtensions';
import { DocMention } from './editor/docMention';
import { findSectionRange } from './editor/findSectionRange';
import { SlashCommands } from './editor/slashCommands';
import type { SlashItem, SlashMenuState } from './editor/slashCommands';

const props = defineProps<{
	content: Record<string, unknown> | null;
	markdown: string | null;
	editable: boolean;
	projectId: string;
	/** Not needed when the editor is read-only. */
	createChildPage?: (title: string) => Promise<{ id: string; title: string }>;
}>();

const emit = defineEmits<{
	'update:content': [content: Record<string, unknown>];
}>();

const i18n = useI18n();
const toast = useToast();

const slashMenu = ref<SlashMenuState | null>(null);

const addChildPage = async (editor: Editor) => {
	try {
		if (!props.createChildPage) return;
		const page = await props.createChildPage(i18n.baseText('docPages.editor.untitledPage'));
		editor
			.chain()
			.focus()
			.insertContent({ type: 'childPageLink', attrs: { pageId: page.id, title: page.title } })
			.run();
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.editor.createPageError'));
	}
};

type SlashItemId =
	| 'text'
	| 'heading1'
	| 'heading2'
	| 'heading3'
	| 'bulletList'
	| 'orderedList'
	| 'taskList'
	| 'table'
	| 'codeBlock'
	| 'quote'
	| 'divider'
	| 'calloutNote'
	| 'calloutTip'
	| 'calloutWarning'
	| 'toggle'
	| 'page';

const slashCommands: Array<[SlashItemId, SlashItem['icon'], SlashItem['run']]> = [
	['text', 'type', (e) => e.chain().focus().setParagraph().run()],
	['heading1', 'heading-1', (e) => e.chain().focus().setHeading({ level: 1 }).run()],
	['heading2', 'heading-2', (e) => e.chain().focus().setHeading({ level: 2 }).run()],
	['heading3', 'heading-3', (e) => e.chain().focus().setHeading({ level: 3 }).run()],
	['bulletList', 'list', (e) => e.chain().focus().toggleBulletList().run()],
	['orderedList', 'list-ordered', (e) => e.chain().focus().toggleOrderedList().run()],
	['taskList', 'list-checks', (e) => e.chain().focus().toggleTaskList().run()],
	[
		'table',
		'table',
		(e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
	],
	['codeBlock', 'code', (e) => e.chain().focus().toggleCodeBlock().run()],
	['quote', 'quote', (e) => e.chain().focus().toggleBlockquote().run()],
	['divider', 'minus', (e) => e.chain().focus().setHorizontalRule().run()],
	['calloutNote', 'info', (e) => e.chain().focus().setCallout('note').run()],
	['calloutTip', 'lightbulb', (e) => e.chain().focus().setCallout('tip').run()],
	['calloutWarning', 'triangle-alert', (e) => e.chain().focus().setCallout('warning').run()],
	['toggle', 'chevron-right', (e) => e.chain().focus().setDetails().run()],
	['page', 'file-text', addChildPage],
];

const slashItems = (): SlashItem[] =>
	slashCommands.map(([id, icon, run]) => ({
		id,
		label: i18n.baseText(`docPages.editor.slash.${id}`),
		icon,
		run,
	}));

const emitContent = (editor: Editor) => emit('update:content', editor.getJSON());

// Load once. The parent re-mounts this component when the page changes.
const loadsMarkdown = !props.content && props.markdown !== null;

const editor = useEditor({
	content: props.content ?? props.markdown ?? undefined,
	contentType: props.content ? 'json' : 'markdown',
	editable: props.editable,
	extensions: [
		...createDocPageBaseExtensions(),
		createChildPageLink(props.projectId),
		DocMention,
		SlashCommands.configure({
			items: slashItems,
			onChange: (state) => {
				slashMenu.value = state;
			},
		}),
	],
	editorProps: {
		attributes: { class: 'doc-page-content', 'data-testid': 'doc-page-editor-content' },
	},
	onCreate: ({ editor }) => {
		// The first autosave then stores JSON in place of the LLM markdown.
		if (loadsMarkdown) emitContent(editor);
	},
	onUpdate: ({ editor }) => emitContent(editor),
});

watch(
	() => props.editable,
	(editable) => editor.value?.setEditable(editable, false),
);

const slashMenuStyle = computed(() => {
	const rect = slashMenu.value?.rect;
	if (!rect) return { display: 'none' };
	return { top: `${rect.bottom}px`, left: `${rect.left}px` };
});

defineExpose({
	getMarkdown: (): string => editor.value?.getMarkdown() ?? '',
	applyFinding: (finding: { heading: string; replacementMarkdown: string }): boolean => {
		if (!editor.value) return false;
		const range = findSectionRange(editor.value.state.doc, finding.heading);
		if (!range) return false;
		return editor.value
			.chain()
			.insertContentAt(range, finding.replacementMarkdown, { contentType: 'markdown' })
			.run();
	},
});
</script>

<template>
	<div :class="$style.editor" data-testid="doc-page-editor">
		<DragHandle v-if="editor && editable" :editor="editor" :class="$style.dragHandle">
			<N8nIcon
				icon="grip-vertical"
				size="small"
				:aria-label="i18n.baseText('docPages.editor.dragHandle')"
			/>
		</DragHandle>
		<EditorContent :editor="editor" />
		<Teleport to="body">
			<div
				v-if="slashMenu"
				:class="$style.slashMenu"
				:style="slashMenuStyle"
				role="listbox"
				data-testid="doc-page-slash-menu"
			>
				<div v-if="slashMenu.items.length === 0" :class="$style.empty">
					{{ i18n.baseText('docPages.editor.slash.noResults') }}
				</div>
				<button
					v-for="(item, index) in slashMenu.items"
					:key="item.id"
					type="button"
					role="option"
					:aria-selected="index === slashMenu.selected"
					:class="[$style.slashItem, { [$style.active]: index === slashMenu.selected }]"
					:data-testid="`doc-page-slash-item-${item.id}`"
					:data-attr="`doc-page-slash-item-${item.id}`"
					@mousedown.prevent="slashMenu.select(item)"
				>
					<span :class="$style.slashIcon"><N8nIcon :icon="item.icon" size="small" /></span>
					{{ item.label }}
				</button>
			</div>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.editor {
	position: relative;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);

	:global(.doc-page-content) {
		outline: none;
		min-height: 200px;
		padding-bottom: var(--spacing--2xl);

		> * + * {
			margin-top: var(--spacing--2xs);
		}

		h1,
		h2,
		h3 {
			font-weight: var(--font-weight--bold);
			line-height: var(--line-height--lg);
			margin-top: var(--spacing--lg);
		}

		h1 {
			font-size: var(--font-size--2xl);
		}

		h2 {
			font-size: var(--font-size--xl);
		}

		h3 {
			font-size: var(--font-size--lg);
		}

		ul,
		ol {
			padding-left: var(--spacing--lg);
		}

		ul {
			list-style: disc;
		}

		ol {
			list-style: decimal;
		}

		ul[data-type='taskList'] {
			list-style: none;
			padding-left: 0;

			li {
				display: flex;
				gap: var(--spacing--2xs);
				align-items: flex-start;

				> label {
					margin-top: var(--spacing--5xs);
				}

				> div {
					flex: 1;
				}
			}
		}

		a {
			color: var(--color--primary);
			text-decoration: underline;
		}

		code {
			font-family: var(--font-family--monospace);
			font-size: 0.9em;
			padding: 0 var(--spacing--5xs);
			border-radius: var(--radius--sm);
			background-color: var(--color--background--light-2);
		}

		pre {
			padding: var(--spacing--sm);
			border-radius: var(--radius);
			background-color: var(--color--background--light-2);
			overflow-x: auto;

			code {
				padding: 0;
				background: none;
			}
		}

		blockquote {
			padding-left: var(--spacing--sm);
			border-left: var(--border-width) var(--border-style) var(--color--text--tint-1);
		}

		hr {
			border: none;
			border-top: var(--border-width) var(--border-style) var(--color--foreground);
			margin: var(--spacing--md) 0;
		}

		table {
			border-collapse: collapse;
			width: 100%;
			table-layout: fixed;

			th,
			td {
				border: var(--border-width) var(--border-style) var(--color--foreground);
				padding: var(--spacing--3xs) var(--spacing--2xs);
				vertical-align: top;
				position: relative;
			}

			th {
				font-weight: var(--font-weight--bold);
				text-align: left;
				background-color: var(--color--background--light-2);
			}

			:global(.selectedCell)::after {
				content: '';
				position: absolute;
				inset: 0;
				pointer-events: none;
				background-color: var(--color--background--highlight);
				opacity: 0.4;
			}

			:global(.column-resize-handle) {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				width: var(--spacing--5xs);
				background-color: var(--color--primary);
				pointer-events: none;
			}
		}

		:global(.tableWrapper) {
			overflow-x: auto;
		}

		div[data-callout] {
			display: block;
			padding: var(--spacing--xs) var(--spacing--sm);
			border-radius: var(--radius);
			border-left: var(--spacing--5xs) var(--border-style) var(--callout--border-color--info);
			background-color: var(--callout--color--background--info);

			&[data-variant='tip'] {
				border-left-color: var(--callout--border-color--success);
				background-color: var(--callout--color--background--success);
			}

			&[data-variant='warning'] {
				border-left-color: var(--callout--border-color--warning);
				background-color: var(--callout--color--background--warning);
			}
		}

		div[data-type='details'] {
			display: flex;
			gap: var(--spacing--4xs);

			> button {
				flex-shrink: 0;
				width: var(--spacing--md);
				height: var(--spacing--md);
				margin-top: var(--spacing--5xs);
				border: none;
				border-radius: var(--radius--sm);
				background: none;
				color: var(--color--text--tint-1);
				cursor: pointer;

				&::before {
					content: '\25B6';
					display: inline-block;
					font-size: var(--font-size--3xs);
					transition: transform 0.15s ease;
				}

				&:hover {
					background-color: var(--color--background--hover);
				}
			}

			&:global(.is-open) > button::before {
				transform: rotate(90deg);
			}

			> div {
				flex: 1;
				min-width: 0;
			}

			summary {
				list-style: none;
				font-weight: var(--font-weight--medium);
			}

			summary::-webkit-details-marker {
				display: none;
			}
		}

		p:global(.is-empty)::before,
		h1:global(.is-empty)::before,
		h2:global(.is-empty)::before,
		h3:global(.is-empty)::before {
			content: attr(data-placeholder);
			float: left;
			height: 0;
			pointer-events: none;
			color: var(--color--text--tint-2);
		}

		:global(.ProseMirror-selectednode) {
			outline: var(--border-width) var(--border-style) var(--color--primary);
			border-radius: var(--radius);
		}
	}
}

.dragHandle {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs) 0;
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-2);
	cursor: grab;

	&:hover {
		background-color: var(--color--background--hover);
		color: var(--color--text--tint-1);
	}
}

.slashMenu {
	position: fixed;
	z-index: 3000;
	display: flex;
	flex-direction: column;
	width: 240px;
	max-height: 320px;
	overflow-y: auto;
	margin-top: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--md);
}

.slashItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
	text-align: left;
	cursor: pointer;

	&:hover,
	&.active {
		background-color: var(--color--background--hover);
	}
}

.slashIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	color: var(--color--text--tint-1);
}

.empty {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}
</style>
