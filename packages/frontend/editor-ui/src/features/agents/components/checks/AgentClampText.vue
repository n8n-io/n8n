<script setup lang="ts">
/**
 * Text cut to a few lines with a "Show more" toggle, so a long agent reply
 * doesn't push the rest of the card out of reach. The toggle only shows when
 * the text actually overflows. With `markdown`, the text renders as the agent
 * wrote it (lists, bold), cut by height since line clamping can't span blocks.
 */
import { nextTick, onMounted, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { N8nMarkdown } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{ text: string; lines?: number; markdown?: boolean; toggle?: boolean }>(),
	{ lines: 5, markdown: false, toggle: true },
);

const i18n = useI18n();
const el = ref<HTMLElement | null>(null);
const open = ref(false);
const overflows = ref(false);

const measure = () => {
	if (!el.value || open.value) return;
	overflows.value = el.value.scrollHeight > el.value.clientHeight + 1;
};

onMounted(measure);
useResizeObserver(el, measure);
watch(
	() => props.text,
	() => {
		open.value = false;
		void nextTick(measure);
	},
);
</script>

<template>
	<div :class="$style.wrap">
		<div
			ref="el"
			:class="[
				$style.text,
				{
					[$style.clamped]: !open && !markdown,
					[$style.capped]: !open && markdown,
					[$style.faded]: !open && markdown && overflows,
					[$style.md]: markdown,
				},
			]"
			:style="{ '--clamp-lines': String(lines) }"
		>
			<N8nMarkdown v-if="markdown" :content="text" />
			<template v-else>{{ text }}</template>
		</div>
		<button
			v-if="overflows && toggle"
			type="button"
			:class="$style.toggle"
			:aria-expanded="open"
			data-testid="agent-clamp-toggle"
			@click="open = !open"
		>
			{{
				open
					? i18n.baseText('agents.builder.agentChecks.thread.less')
					: i18n.baseText('agents.builder.agentChecks.thread.more')
			}}
		</button>
	</div>
</template>

<style lang="scss" module>
.wrap {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.text {
	max-width: 100%;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.clamped {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: var(--clamp-lines);
	line-clamp: var(--clamp-lines);
	overflow: hidden;
}

.capped {
	max-height: calc(var(--clamp-lines) * 1lh);
	overflow: hidden;
}

.faded {
	mask-image: linear-gradient(to bottom, #000 calc(100% - 1lh), transparent);
}

// The reply reads as part of the bubble: inherited size, tight block spacing.
.md {
	white-space: normal;

	:global(.n8n-markdown) *,
	:global(.n8n-markdown) {
		font-size: inherit;
		line-height: inherit;
		color: inherit;
	}

	:global(.n8n-markdown) {
		p,
		ul,
		ol,
		pre,
		blockquote,
		h1,
		h2,
		h3,
		h4 {
			margin: 0 0 var(--spacing--3xs);
		}

		ul,
		ol {
			padding-left: var(--spacing--lg);
		}

		li {
			margin: 0;
		}

		// The global markdown sets numbers in monospace, wider than the indent here.
		li::marker {
			font-family: inherit;
		}

		h1,
		h2,
		h3,
		h4 {
			font-weight: var(--font-weight--bold);
		}

		> div > :last-child {
			margin-bottom: 0;
		}
	}
}

.toggle {
	padding: 0;
	border: 0;
	background: none;
	color: var(--text-color--subtle);
	font: inherit;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
		text-decoration: underline;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: 2px;
	}
}
</style>
