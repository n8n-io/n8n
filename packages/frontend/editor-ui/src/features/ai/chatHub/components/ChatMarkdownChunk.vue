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
	& * {
		font-size: var(--font-size--sm);
		line-height: 1.5;
	}

	& > div {
		display: block;
		box-sizing: border-box;
	}

	&:first-child > div > *:first-child {
		margin-top: 0;
	}

	& > div > *:last-child {
		margin-bottom: 0;
	}

	p {
		margin: var(--spacing--xs) 0;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 1em 0 0.8em;
		line-height: var(--line-height--md);
	}

	// Override heading sizes to be smaller
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

	h4 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h5 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	h6 {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--bold);
	}

	pre {
		display: block;
		font-family: inherit;
		font-size: inherit;
		margin: 0;
		white-space: pre-wrap;
		box-sizing: border-box;
		padding: var(--chat--spacing);
		background: var(--chat--message--pre--background);
		border-radius: var(--chat--border-radius);
		position: relative;

		code:last-of-type {
			padding-bottom: 0;
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
			margin-bottom: 1em;
		}
	}

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
		width: fit-content;
		border-bottom: var(--border);
		border-top: var(--border);
		border-width: 2px;
		border-color: var(--color--text--shade-1);
	}

	th,
	td {
		padding: 0.25em 1em 0.25em 0;
		min-width: 12em;
	}

	th {
		border-bottom: var(--border);
		border-color: var(--color--text--shade-1);
	}

	ul,
	ol {
		li {
			margin-bottom: 0.125rem;
		}
	}
}
</style>
