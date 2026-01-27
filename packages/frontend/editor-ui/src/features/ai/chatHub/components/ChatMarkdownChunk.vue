<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import { ref, useCssModule } from 'vue';

const { source } = defineProps<{
	source: string;
}>();

const styles = useCssModule();
const markdown = useChatHubMarkdownOptions(styles.codeBlockActions, styles.tableContainer);
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);

function getHoveredCodeBlockContent() {
	const idx = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');
	return idx ? markdown.codeBlockContents.value?.get(idx) : undefined;
}

function handleMouseMove(e: MouseEvent | FocusEvent) {
	const container =
		e.target instanceof HTMLElement || e.target instanceof SVGElement
			? e.target.closest('pre')?.querySelector(`.${styles.codeBlockActions}`)
			: null;

	hoveredCodeBlockActions.value = container instanceof HTMLElement ? container : null;
}

function handleMouseLeave() {
	hoveredCodeBlockActions.value = null;
}

defineExpose({
	hoveredCodeBlockActions,
	getHoveredCodeBlockContent,
});
</script>

<template>
	<VueMarkdown
		:key="markdown.forceReRenderKey.value"
		:source="source"
		:class="$style.chatMessageMarkdown"
		:options="markdown.options"
		:plugins="markdown.plugins.value"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	/>
</template>

<style lang="scss" module>
.chatMessageMarkdown {
	--markdown--spacing: var(--spacing--2xs);

	display: block;
	color: var(--color--text--shade-1);

	// Paragraphs and normal text
	p,
	li {
		font-size: var(--font-size--md);
		line-height: var(--line-height--xl);
		margin: calc(var(--markdown--spacing) * 2) 0;
	}

	li {
		margin: 0;
	}

	// Headings - with scroll margin for anchor navigation
	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 0;
		color: var(--color--text--shade-1);
		line-height: var(--line-height--md);
		font-weight: var(--font-weight--bold);
		scroll-margin-top: calc(var(--markdown--spacing) * 4);
	}

	h1 {
		font-size: var(--font-size--xl);
		margin-top: calc(var(--markdown--spacing) * 3);
	}

	h2 {
		font-size: var(--font-size--lg);
		margin-top: calc(var(--markdown--spacing) * 4);
	}

	h3 {
		font-size: var(--font-size--md);
		margin-top: calc(var(--markdown--spacing) * 4);
	}

	h4 {
		font-size: var(--font-size--sm);
		margin-top: calc(var(--markdown--spacing) * 4);
	}

	h5,
	h6 {
		font-size: var(--font-size--sm);
		margin-top: calc(var(--markdown--spacing) * 3);
	}

	h2 + h3 {
		margin-top: calc(var(--markdown--spacing) * 3);
	}

	// Headings inside list items should have no top margin
	li > :is(h1, h2, h3, h4, h5, h6, p, strong):first-child {
		margin-top: 0;
		display: inline-block;
	}

	// Strong/bold text
	strong,
	b {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}

	// Links
	a:not(:where(h1, h2, h3, h4, h5, h6) *) {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--medium);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-thickness: 1px;
		transition: color 0.15s ease;

		&:hover {
			color: var(--color--primary);
		}

		code {
			font-weight: var(--font-weight--medium);
		}
	}

	// Inline code (not in pre blocks)
	:not(pre) > code {
		font-family: var(--font-family--monospace);
		font-weight: var(--font-weight--medium);
		font-size: var(--font-size--sm);
		padding: calc(var(--markdown--spacing) * 0.25) calc(var(--markdown--spacing) * 0.5);
		line-height: var(--line-height--lg);
		background-color: var(--chat--message--pre--background);
		border-radius: var(--radius--sm);
		font-variant-ligatures: none;
	}

	// Code in headings
	:is(h1, h2, h3, h4, h5, h6) code {
		font-weight: var(--font-weight--bold);
	}

	// Code blocks
	pre {
		width: 100%;
		font-family: var(--font-family--monospace);
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
		margin: var(--markdown--spacing) 0 calc(var(--markdown--spacing) * 2.5);
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: calc(var(--markdown--spacing) * 2);
		background: var(--chat--message--pre--background);
		border-radius: var(--radius--lg);
		position: relative;

		code {
			font-family: var(--font-family--monospace);
			font-variant-ligatures: none;

			&::before,
			&::after {
				content: none;
			}
		}

		code:last-of-type {
			padding-bottom: 0;
		}

		// Reset spacing inside code blocks
		code * + * {
			margin-top: 0;
		}

		& .codeBlockActions {
			position: sticky;
			top: var(--markdown--spacing);
			right: var(--markdown--spacing);
			height: 0;
			display: flex;
			justify-content: flex-end;
			pointer-events: none;
			z-index: 1;

			& > * {
				pointer-events: auto;
			}
		}

		& ~ pre {
			margin-bottom: calc(var(--markdown--spacing) * 2.5);
		}
	}

	// Blockquotes
	blockquote {
		font-style: italic;
		border-left: calc(var(--markdown--spacing) * 0.5) solid var(--color--foreground--shade-1);
		padding-left: calc(var(--markdown--spacing) * 2);
		margin: calc(var(--markdown--spacing) * 2) 0;
		color: var(--color--text--tint-1);

		p:first-of-type::before {
			content: open-quote;
		}

		p:last-of-type::after {
			content: close-quote;
		}
	}

	// Horizontal rules
	hr {
		border: none;
		border-top: var(--border-width) var(--border-style) var(--color--foreground);
		margin: calc(var(--markdown--spacing) * 3) 0;

		& + h2 {
			margin-top: calc(var(--markdown--spacing) * 3);
		}
	}

	// Ordered lists
	ol {
		padding-left: calc(var(--markdown--spacing) * 2);
		list-style-type: decimal;
		list-style-position: inside;
		margin: calc(var(--markdown--spacing) * 2) 0;

		li + li {
			margin-top: calc(var(--markdown--spacing) * 1.5);
		}

		li::marker {
			font-family: var(--font-family--monospace);
			color: var(--color--text);
		}
	}

	// Unordered lists
	ul {
		padding-left: calc(var(--markdown--spacing) * 2);
		list-style-type: disc;
		list-style-position: inside;
		margin: calc(var(--markdown--spacing) * 2) 0;

		li + li {
			margin-top: var(--markdown--spacing);
		}

		li::marker {
			color: var(--color--foreground--shade-1);
		}
	}

	// Nested lists
	ul ul,
	ol ol,
	ul ol,
	ol ul {
		margin-top: var(--markdown--spacing);
		margin-bottom: 0;
		padding-left: calc(var(--markdown--spacing) * 3);
	}

	// Tables
	.tableContainer {
		width: 100%;
		overflow-x: auto;
	}

	table {
		width: 100%;
		table-layout: auto;
		margin: calc(var(--markdown--spacing) * 2) 0;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--lg);
	}

	thead {
		border-bottom-width: 1px;
		border-bottom-style: solid;
		border-bottom-color: var(--color--neutral-300);
	}

	thead th {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
		vertical-align: bottom;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
		text-align: start;
	}

	thead th:first-child {
		padding-inline-start: 0;
	}

	thead th:last-child {
		padding-inline-end: 0;
	}

	tbody tr {
		border-bottom-width: 1px;
		border-bottom-style: solid;
		border-bottom-color: var(--color--neutral-200);
	}

	tbody tr:last-child {
		border-bottom-width: 0;
	}

	tbody td {
		vertical-align: baseline;
		padding-top: 0.8em;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
	}

	tbody td:first-child {
		padding-inline-start: 0;
	}

	tbody td:last-child {
		padding-inline-end: 0;
	}

	tfoot {
		border-top-width: 1px;
		border-top-style: solid;
		border-top-color: var(--color--neutral-300);
	}

	tfoot td {
		vertical-align: top;
		padding-top: 0.8em;
		padding-inline-start: 0.6em;
		padding-inline-end: 0.6em;
		padding-bottom: 0.8em;
	}

	tfoot td:first-child {
		padding-inline-start: 0;
	}

	tfoot td:last-child {
		padding-inline-end: 0;
	}

	td code {
		font-size: var(--font-size--xs);
	}

	th,
	td {
		text-align: start;
	}

	// Figures and captions
	figure {
		margin: calc(var(--markdown--spacing) * 2) 0;
	}

	figcaption {
		margin-top: calc(var(--markdown--spacing) * 1.5);
		text-align: center;
		font-size: var(--font-size--sm);
		font-style: italic;
		color: var(--color--text--tint-1);
	}
}
</style>
