<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useChatHubMarkdownOptions } from '@/features/ai/chatHub/composables/useChatHubMarkdownOptions';
import CopyButton from '@/features/ai/chatHub/components/CopyButton.vue';
import { computed, ref, useCssModule } from 'vue';

const { source, containerWidth } = defineProps<{
	source: string;
	containerWidth: number;
}>();

const styles = useCssModule();
const markdown = useChatHubMarkdownOptions(styles.codeBlockActions, styles.tableContainer);
const hoveredCodeBlockActions = ref<HTMLElement | null>(null);

const hoveredCodeBlockContent = computed(() => {
	const idx = hoveredCodeBlockActions.value?.getAttribute('data-markdown-token-idx');
	return idx ? markdown.codeBlockContents.value?.get(idx) : undefined;
});

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
</script>

<template>
	<div
		:class="[$style.chatMessageMarkdown, 'chat-message-markdown']"
		:style="{
			'--container--width': `${containerWidth}px`,
		}"
		@mousemove="handleMouseMove"
		@mouseleave="handleMouseLeave"
	>
		<VueMarkdown
			:key="markdown.forceReRenderKey.value"
			:source="source"
			:options="markdown.options"
			:plugins="markdown.plugins.value"
		/>
		<Teleport
			v-if="hoveredCodeBlockActions && hoveredCodeBlockContent"
			:to="hoveredCodeBlockActions"
		>
			<CopyButton :content="hoveredCodeBlockContent" />
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.chatMessageMarkdown {
	display: block;
	box-sizing: border-box;
	color: var(--color--text--shade-1);

	// Base spacing rhythm between sibling elements
	> * + * {
		margin-top: var(--spacing--sm);
	}

	> *:first-child {
		margin-top: 0;
	}

	> *:last-child {
		margin-bottom: 0;
	}

	// Paragraphs and normal text
	p,
	li {
		font-size: var(--font-size--md);
		line-height: var(--line-height--xl);
		margin: var(--spacing--sm) 0;
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
		color: var(--color--text--shade-1);
		line-height: var(--line-height--md);
		scroll-margin-top: var(--spacing--xl);
	}

	h1 {
		font-size: var(--font-size--xl);
		font-weight: var(--font-weight--bold);
	}

	h2 {
		font-size: var(--font-size--lg);
		font-weight: var(--font-weight--bold);
	}

	h3 {
		font-size: var(--font-size--md);
		font-weight: var(--font-weight--bold);
	}

	h2 + h3 {
		margin-top: var(--spacing--sm);
	}

	h4 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h5,
	h6 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
		margin-top: var(--spacing--sm);
	}

	// Strong/bold text
	strong,
	b {
		font-size: var(--font-size--md);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--bold);
	}

	// Links
	a:not(:where(h1, h2, h3, h4, h5, h6) *) {
		font-size: var(--font-size--md);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--medium);
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--color--secondary);
		text-decoration-thickness: 1px;
		transition: text-decoration-thickness 0.15s ease;

		&:hover {
			text-decoration-thickness: 2px;
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
		margin: var(--spacing--2xs) 0 var(--spacing--md);
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: var(--spacing--sm);
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
			top: var(--spacing--sm);
			display: flex;
			justify-content: flex-end;
			height: 32px;
			pointer-events: none;

			& > * {
				pointer-events: auto;
			}
		}

		& .codeBlockActions ~ code {
			margin-top: -32px;
		}

		& ~ pre {
			margin-bottom: var(--spacing--md);
		}
	}

	// Blockquotes
	blockquote {
		font-size: var(--font-size--md);
		font-style: italic;
		border-left: var(--spacing--4xs) solid var(--color--foreground--shade-1);
		padding-left: var(--spacing--sm);
		margin: var(--spacing--sm) 0;
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
		margin: var(--spacing--lg) 0;

		& + h2 {
			margin-top: var(--spacing--lg);
		}
	}

	// Ordered lists
	ol {
		padding-left: 0;
		list-style-type: decimal;
		list-style-position: inside;
		margin: var(--spacing--sm) 0;

		li + li {
			margin-top: var(--spacing--xs);
		}

		li::marker {
			font-family: var(--font-family--monospace);
			color: var(--color--text);
		}
	}

	// Unordered lists
	ul {
		padding-left: 0;
		list-style-type: disc;
		list-style-position: inside;
		margin: var(--spacing--sm) 0;

		li + li {
			margin-top: var(--spacing--2xs);
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
		margin-top: var(--spacing--2xs);
		margin-bottom: 0;
		padding-left: var(--spacing--lg);
	}

	// Tables
	.tableContainer {
		width: var(--container--width);
		padding-bottom: 1em;
		padding-left: calc((var(--container--width) - 100%) / 2);
		padding-right: var(--spacing--lg);
		margin-left: calc(-1 * (var(--container--width) - 100%) / 2);
		overflow-x: auto;

		&:first-child {
			padding-top: 1em;
		}
	}

	table {
		width: 100%;
		table-layout: auto;
		margin: var(--spacing--sm) 0;
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
		margin: var(--spacing--sm) 0;
	}

	figcaption {
		margin-top: var(--spacing--xs);
		text-align: center;
		font-size: var(--font-size--sm);
		font-style: italic;
		color: var(--color--text--tint-1);
	}
}
</style>
